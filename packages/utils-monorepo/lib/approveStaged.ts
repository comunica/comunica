// eslint-disable-next-line import/no-nodejs-modules
import { parseArgs } from 'node:util';
import type { IStagedVersion, NpmRunner } from './npmCli';
import {
  assertNpmStageSupport,
  getPublicPackages,
  isOtpError,
  isOtpRateLimitError,
  isRateLimitError,
  listStaged,
  npmErrorMessage,
  parseConcurrency,
  promptTerminal,
  RateLimitBackoff,
  runNpm,
} from './npmCli';

/**
 * How many times a single approval is retried with a new OTP.
 */
export const MAX_OTP_ATTEMPTS = 3;

export interface IApproveStagedOptions {
  /**
   * The monorepo directory.
   */
  cwd: string;
  /**
   * Only approve staged versions with this version.
   */
  version?: string;
  /**
   * The number of approvals that run in parallel.
   */
  concurrency: number;
  /**
   * Skip the confirmation prompt.
   */
  yes: boolean;
  npm: NpmRunner;
  prompt: (question: string) => Promise<string>;
  log: (message: string) => void;
  backoff: RateLimitBackoff;
}

/**
 * Approve all staged versions of the packages in a monorepo.
 *
 * Dependencies are approved before their dependents, and dependents of a version that could not be approved are
 * skipped, so a published package never depends on a version that is still staged.
 * One OTP is reused until npm rejects it. Then no new approvals start until a new OTP is entered, to avoid failed
 * attempts that make npm temporarily refuse OTPs, in which case this stops.
 * When npm rate limits otherwise, all approvals pause and are retried afterwards.
 * @param options The options.
 * @return If all staged versions were approved.
 */
export async function approveStaged(options: IApproveStagedOptions): Promise<boolean> {
  const { npm, prompt, backoff } = options;

  await assertNpmStageSupport(npm);
  const packages = new Map((await getPublicPackages(options.cwd)).map(pkg => [ pkg.name, pkg ]));
  const staged = (await listStaged(npm))
    .filter(item => packages.has(item.packageName) &&
      (options.version === undefined || item.version === options.version));
  if (staged.length === 0) {
    options.log('No staged versions found for the packages in this monorepo.');
    return true;
  }

  const versions = [ ...new Set(staged.map(item => item.version)) ];
  if (versions.length > 1) {
    throw new Error(`Found staged versions for multiple versions (${versions.join(', ')}). Pick one with --version.`);
  }
  const statusCounts: Record<string, number> = {};
  for (const item of staged) {
    const status = item.status ?? 'unknown';
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;
  }
  options.log(`Found ${staged.length} staged packages at version ${versions[0]} (status: ${Object.entries(statusCounts)
    .map(([ status, count ]) => `${count} ${status}`).join(', ')}).`);

  if (!options.yes && !/^y(?:es)?$/iu.test(await prompt(`Approve all ${staged.length}? [y/N] `))) {
    options.log('Aborted.');
    return true;
  }

  let otp = await prompt('Enter OTP: ');
  let otpRequest: Promise<string> | undefined;
  // Messages are held back while asking for a new OTP, so they don't hide the prompt.
  const heldBack: string[] = [];
  const log = (message: string): void => {
    if (otpRequest) {
      heldBack.push(message);
    } else {
      options.log(message);
    }
  };
  // Ask for a new OTP once, even if several parallel approvals fail with the same expired OTP.
  const renewOtp = async(usedOtp: string): Promise<void> => {
    if (otp !== usedOtp) {
      return;
    }
    if (!otpRequest) {
      otpRequest = prompt('The OTP was rejected or expired, so approvals are paused. Enter a new OTP: ')
        .then((newOtp) => {
          otp = newOtp;
          return newOtp;
        })
        .finally(() => {
          otpRequest = undefined;
          for (const message of heldBack.splice(0)) {
            options.log(message);
          }
        });
    }
    await otpRequest;
  };

  const byName = new Map(staged.map(item => [ item.packageName, item ]));
  const stagedDependencies = new Map(staged.map(item => [
    item.packageName,
    packages.get(item.packageName)!.dependencies.filter(dependency => byName.has(dependency)),
  ]));
  const pending = new Set(byName.keys());
  const approvedNames = new Set<string>();
  const failures: string[] = [];
  let approved = 0;
  let inFlight = 0;
  let otpLockout: string | undefined;
  const waiters: (() => void)[] = [];

  // Take a version of which all staged dependencies are approved.
  const takeNext = (): IStagedVersion | undefined => {
    for (const name of pending) {
      if (stagedDependencies.get(name)!.every(dependency => approvedNames.has(dependency))) {
        pending.delete(name);
        return byName.get(name);
      }
    }
    // Only a dependency cycle can block all remaining versions while nothing is being approved.
    if (inFlight === 0) {
      const [ name ] = pending;
      pending.delete(name);
      return byName.get(name);
    }
  };

  const skipDependents = (name: string): void => {
    for (const other of pending) {
      if (stagedDependencies.get(other)!.includes(name)) {
        pending.delete(other);
        failures.push(`${other}@${versions[0]}: skipped, because ${name} was not approved`);
        skipDependents(other);
      }
    }
  };

  const approve = async(item: IStagedVersion): Promise<'approved' | 'failed' | 'stopped'> => {
    const label = `${item.packageName}@${item.version}`;
    let otpAttempts = 0;
    while (true) {
      await backoff.waitIfPaused();
      if (otpRequest) {
        await otpRequest;
        continue;
      }
      if (otpLockout) {
        return 'stopped';
      }
      const usedOtp = otp;
      const result = await npm([ 'stage', 'approve', item.id, `--otp=${usedOtp}` ]);
      if (result.code === 0) {
        backoff.success();
        approved++;
        log(`[${approved}/${staged.length}] Approved ${label}`);
        return 'approved';
      }
      const message = npmErrorMessage(result.stderr);
      if (isOtpRateLimitError(result.stderr)) {
        otpLockout ??= message;
        return 'stopped';
      }
      if (isRateLimitError(result.stderr)) {
        const delay = backoff.hit();
        if (delay !== undefined) {
          log(`npm is rate limiting (${message}), so waiting ${delay / 1000}s before continuing (${approved}/${staged.length} approved).`);
        }
        continue;
      }
      if (isOtpError(result.stderr) && ++otpAttempts < MAX_OTP_ATTEMPTS) {
        await renewOtp(usedOtp);
        continue;
      }
      failures.push(`${label}: ${message}`);
      return 'failed';
    }
  };

  await Promise.all(Array.from({ length: options.concurrency }, async() => {
    while (pending.size > 0) {
      if (otpLockout) {
        return;
      }
      const item = takeNext();
      if (!item) {
        await new Promise<void>(resolve => waiters.push(resolve));
        continue;
      }
      inFlight++;
      const outcome = await approve(item);
      inFlight--;
      if (outcome === 'approved') {
        approvedNames.add(item.packageName);
      } else if (outcome === 'failed') {
        skipDependents(item.packageName);
      }
      for (const wake of waiters.splice(0)) {
        wake();
      }
    }
  }));

  options.log(`Approved ${approved} of ${staged.length} staged versions.`);
  if (failures.length > 0) {
    options.log(`Failed to approve ${failures.length}:\n${failures.map(failure => `  ${failure}`).join('\n')}`);
  }
  if (otpLockout) {
    const remaining = staged.length - approved - failures.length;
    options.log(`Stopped, because npm temporarily refuses one-time passwords (${otpLockout}). Wait a while, then approve the remaining ${remaining} on npmjs.com or by running this again.`);
  }
  return failures.length === 0 && !otpLockout;
}

/**
 * Run approveStaged from command line arguments.
 * @param argv The command line arguments, without the node binary and script.
 * @param cwd The monorepo directory.
 * @return If all staged versions were approved.
 */
export async function approveStagedCli(argv: string[], cwd: string): Promise<boolean> {
  const { values } = parseArgs({
    args: argv,
    options: {
      version: { type: 'string' },
      // Each parallel approval fails once when an OTP expires, and too many failures make npm refuse OTPs.
      concurrency: { type: 'string', default: '2' },
      yes: { type: 'boolean', short: 'y', default: false },
    },
  });
  return approveStaged({
    cwd,
    version: values.version,
    concurrency: parseConcurrency(values.concurrency),
    yes: values.yes,
    npm: runNpm,
    prompt: promptTerminal,
    // eslint-disable-next-line no-console
    log: message => console.log(message),
    backoff: new RateLimitBackoff(30_000, 300_000),
  });
}
