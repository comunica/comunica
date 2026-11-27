// eslint-disable-next-line import/no-nodejs-modules
import { parseArgs } from 'node:util';
import type { IStagedVersion, NpmRunner } from './npmCli';
import {
  assertNpmStageSupport,
  getPublicPackages,
  isOtpError,
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
 * One OTP is reused until npm rejects it, after which a new one is requested.
 * When npm rate limits, all approvals pause and are retried afterwards.
 * @param options The options.
 * @return If all staged versions were approved.
 */
export async function approveStaged(options: IApproveStagedOptions): Promise<boolean> {
  const { npm, prompt, log, backoff } = options;

  await assertNpmStageSupport(npm);
  const packageNames = new Set((await getPublicPackages(options.cwd)).map(pkg => pkg.name));
  const staged = (await listStaged(npm))
    .filter(item => packageNames.has(item.packageName) &&
      (options.version === undefined || item.version === options.version));
  if (staged.length === 0) {
    log('No staged versions found for the packages in this monorepo.');
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
  log(`Found ${staged.length} staged packages at version ${versions[0]} (status: ${Object.entries(statusCounts)
    .map(([ status, count ]) => `${count} ${status}`).join(', ')}).`);

  if (!options.yes && !/^y(?:es)?$/iu.test(await prompt(`Approve all ${staged.length}? [y/N] `))) {
    log('Aborted.');
    return true;
  }

  let otp = await prompt('Enter OTP: ');
  let otpRequest: Promise<string> | undefined;
  // Ask for a new OTP once, even if several parallel approvals fail with the same expired OTP.
  const renewOtp = async(usedOtp: string): Promise<string> => {
    if (otp !== usedOtp) {
      return otp;
    }
    if (!otpRequest) {
      otpRequest = prompt('The OTP was rejected or expired. Enter a new OTP: ').then((newOtp) => {
        otp = newOtp;
        otpRequest = undefined;
        return newOtp;
      });
    }
    return otpRequest;
  };

  const queue = [ ...staged ];
  const failures: string[] = [];
  let approved = 0;

  const approve = async(item: IStagedVersion): Promise<void> => {
    const label = `${item.packageName}@${item.version}`;
    let otpAttempts = 0;
    while (true) {
      await backoff.waitIfPaused();
      const usedOtp = otp;
      const result = await npm([ 'stage', 'approve', item.id, `--otp=${usedOtp}` ]);
      if (result.code === 0) {
        backoff.success();
        approved++;
        log(`[${approved}/${staged.length}] Approved ${label}`);
        return;
      }
      if (isRateLimitError(result.stderr)) {
        const delay = backoff.hit();
        if (delay !== undefined) {
          log(`npm is rate limiting, so waiting ${delay / 1000}s before continuing (${approved}/${staged.length} approved).`);
        }
        continue;
      }
      if (isOtpError(result.stderr) && ++otpAttempts < MAX_OTP_ATTEMPTS) {
        await renewOtp(usedOtp);
        continue;
      }
      failures.push(`${label}: ${npmErrorMessage(result.stderr)}`);
      return;
    }
  };

  await Promise.all(Array.from({ length: options.concurrency }, async() => {
    while (queue.length > 0) {
      await approve(queue.shift()!);
    }
  }));

  log(`Approved ${approved} of ${staged.length} staged versions.`);
  if (failures.length > 0) {
    log(`Failed to approve ${failures.length}:\n${failures.map(failure => `  ${failure}`).join('\n')}`);
  }
  return failures.length === 0;
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
      concurrency: { type: 'string', default: '4' },
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
