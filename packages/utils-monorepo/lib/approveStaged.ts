// eslint-disable-next-line import/no-nodejs-modules
import { spawn } from 'node:child_process';

// eslint-disable-next-line import/no-nodejs-modules
import { createInterface } from 'node:readline';

// eslint-disable-next-line import/no-nodejs-modules
import { parseArgs } from 'node:util';
import semver from 'semver';

// eslint-disable-next-line ts/no-var-requires,ts/no-require-imports
const { getPackages } = require('@manypkg/get-packages');

/**
 * The first npm version that has the `npm stage` commands.
 */
export const MIN_NPM_VERSION = '11.15.0';

/**
 * How many times a single approval is retried with a new OTP.
 */
export const MAX_OTP_ATTEMPTS = 3;

/**
 * A staged package version, as listed by `npm stage list --json`.
 */
export interface IStagedVersion {
  id: string;
  packageName: string;
  version: string;
  status?: string;
}

export interface INpmResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

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
  npm: (args: string[]) => Promise<INpmResult>;
  prompt: (question: string) => Promise<string>;
  log: (message: string) => void;
}

/**
 * Run an npm command and capture its output.
 * Stdin is ignored, so npm fails with EOTP instead of prompting by itself.
 * @param args The npm arguments.
 */
export function runNpm(args: string[]): Promise<INpmResult> {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', args, { stdio: [ 'ignore', 'pipe', 'pipe' ]});
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => {
      stdout += data;
    });
    child.stderr.on('data', (data) => {
      stderr += data;
    });
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
}

/**
 * Ask a question on the terminal.
 * Rejects if the terminal is closed before answering, such as with Ctrl+C.
 * @param question The question.
 * @return The trimmed answer.
 */
export function promptTerminal(question: string): Promise<string> {
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve, reject) => {
    readline.on('close', () => reject(new Error('Aborted')));
    readline.question(question, (answer) => {
      resolve(answer.trim());
      readline.close();
    });
  });
}

/**
 * Extract the error message from npm's stderr output.
 * @param stderr The stderr output of an npm command.
 */
export function npmErrorMessage(stderr: string): string {
  const lines = stderr.split('\n')
    .filter(line => line.startsWith('npm error '))
    .map(line => line.slice('npm error '.length))
    .filter(line => !line.startsWith('A complete log of this run'));
  return lines.length > 0 ? lines.join(' ') : stderr.trim();
}

/**
 * Check if npm failed because the registry is rate limiting.
 * @param stderr The stderr output of an npm command.
 */
export function isRateLimitError(stderr: string): boolean {
  return /\bE429\b|rate limit/iu.test(stderr);
}

/**
 * Check if npm failed because of a missing, invalid or expired OTP.
 * @param stderr The stderr output of an npm command.
 */
export function isOtpError(stderr: string): boolean {
  return /\bEOTP\b|one-time pass/iu.test(stderr);
}

/**
 * Get the names of all non-private packages in the given monorepo.
 * @param cwd The monorepo directory.
 */
export async function getPublicPackageNames(cwd: string): Promise<Set<string>> {
  const { packages } = await getPackages(cwd);
  return new Set(packages
    .filter((pkg: any) => !pkg.packageJson.private)
    .map((pkg: any) => pkg.packageJson.name));
}

/**
 * Approve all staged versions of the packages in a monorepo.
 * One OTP is reused until npm rejects it, after which a new one is requested.
 * @param options The options.
 * @return If all staged versions were approved.
 */
export async function approveStaged(options: IApproveStagedOptions): Promise<boolean> {
  const { npm, prompt, log } = options;

  const versionResult = await npm([ '--version' ]);
  const npmVersion = versionResult.stdout.trim();
  if (!semver.valid(npmVersion) || semver.lt(npmVersion, MIN_NPM_VERSION)) {
    throw new Error(`Approving staged versions requires npm ${MIN_NPM_VERSION} or later, but found "${npmVersion}". Upgrade with: npm install -g npm@latest`);
  }

  const packageNames = await getPublicPackageNames(options.cwd);
  const listResult = await npm([ 'stage', 'list', '--json' ]);
  if (listResult.code !== 0) {
    throw new Error(`Failed to list staged versions: ${npmErrorMessage(listResult.stderr)}`);
  }
  const staged: IStagedVersion[] = (<IStagedVersion[]> JSON.parse(listResult.stdout))
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
  let rateLimited = false;

  const approve = async(item: IStagedVersion): Promise<void> => {
    const label = `${item.packageName}@${item.version}`;
    for (let attempt = 1; ; attempt++) {
      const usedOtp = otp;
      const result = await npm([ 'stage', 'approve', item.id, `--otp=${usedOtp}` ]);
      if (result.code === 0) {
        approved++;
        log(`[${approved}/${staged.length}] Approved ${label}`);
        return;
      }
      if (isRateLimitError(result.stderr)) {
        rateLimited = true;
      } else if (isOtpError(result.stderr) && attempt < MAX_OTP_ATTEMPTS) {
        await renewOtp(usedOtp);
        continue;
      }
      failures.push(`${label}: ${npmErrorMessage(result.stderr)}`);
      return;
    }
  };

  await Promise.all(Array.from({ length: options.concurrency }, async() => {
    while (queue.length > 0) {
      if (rateLimited) {
        return;
      }
      await approve(queue.shift()!);
    }
  }));

  log(`Approved ${approved} of ${staged.length} staged versions.`);
  if (failures.length > 0) {
    log(`Failed to approve ${failures.length}:\n${failures.map(failure => `  ${failure}`).join('\n')}`);
  }
  if (rateLimited) {
    log(`npm is rate limiting, so ${queue.length} were not attempted. Wait a while and run this again.`);
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
  const concurrency = Number(values.concurrency);
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error(`--concurrency must be a positive integer, but got "${values.concurrency}"`);
  }
  return approveStaged({
    cwd,
    version: values.version,
    concurrency,
    yes: values.yes,
    npm: runNpm,
    prompt: promptTerminal,
    // eslint-disable-next-line no-console
    log: message => console.log(message),
  });
}
