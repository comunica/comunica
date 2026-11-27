// eslint-disable-next-line import/no-nodejs-modules
import { spawn } from 'node:child_process';

// eslint-disable-next-line import/no-nodejs-modules
import { createInterface } from 'node:readline';
import semver from 'semver';

// eslint-disable-next-line ts/no-var-requires,ts/no-require-imports
const { getPackages } = require('@manypkg/get-packages');

/**
 * The first npm version that has the `npm stage` commands.
 */
export const MIN_NPM_VERSION = '11.15.0';

export interface INpmResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

/**
 * Runs an npm command, optionally in the given directory.
 */
export type NpmRunner = (args: string[], cwd?: string) => Promise<INpmResult>;

/**
 * A staged package version, as listed by `npm stage list --json`.
 */
export interface IStagedVersion {
  id: string;
  packageName: string;
  version: string;
  status?: string;
}

/**
 * A non-private package in a monorepo.
 */
export interface IPublicPackage {
  name: string;
  version: string;
  dir: string;
}

/**
 * Run an npm command and capture its output.
 * Stdin is ignored, so npm fails with EOTP instead of prompting by itself.
 * @param args The npm arguments.
 * @param cwd The directory to run npm in.
 */
export function runNpm(args: string[], cwd?: string): Promise<INpmResult> {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', args, { cwd, stdio: [ 'ignore', 'pipe', 'pipe' ]});
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
 * Wait for the given time.
 * @param ms The time in milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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
 * Parse a --concurrency option value.
 * @param value The option value.
 */
export function parseConcurrency(value: string): number {
  const concurrency = Number(value);
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error(`--concurrency must be a positive integer, but got "${value}"`);
  }
  return concurrency;
}

/**
 * Throw if the installed npm does not have the `npm stage` commands.
 * @param npm The npm runner.
 */
export async function assertNpmStageSupport(npm: NpmRunner): Promise<void> {
  const npmVersion = (await npm([ '--version' ])).stdout.trim();
  if (!semver.valid(npmVersion) || semver.lt(npmVersion, MIN_NPM_VERSION)) {
    throw new Error(`npm stage requires npm ${MIN_NPM_VERSION} or later, but found "${npmVersion}". Upgrade with: npm install -g npm@latest`);
  }
}

/**
 * Get all non-private packages in the given monorepo.
 * @param cwd The monorepo directory.
 */
export async function getPublicPackages(cwd: string): Promise<IPublicPackage[]> {
  const { packages } = await getPackages(cwd);
  return packages
    .filter((pkg: any) => !pkg.packageJson.private)
    .map((pkg: any) => ({ name: pkg.packageJson.name, version: pkg.packageJson.version, dir: pkg.dir }));
}

/**
 * List all staged versions that the npm user can see.
 * @param npm The npm runner.
 */
export async function listStaged(npm: NpmRunner): Promise<IStagedVersion[]> {
  const result = await npm([ 'stage', 'list', '--json' ]);
  if (result.code !== 0) {
    throw new Error(`Failed to list staged versions: ${npmErrorMessage(result.stderr)}`);
  }
  return JSON.parse(result.stdout);
}

/**
 * Pauses all requests after the registry rate limits one of them.
 * The pause doubles on each consecutive rate limit, and resets after a success.
 */
export class RateLimitBackoff {
  private delay: number;
  private resumeAt = 0;

  /**
   * @param initialDelay The first pause in milliseconds.
   * @param maxDelay The longest pause in milliseconds.
   * @param wait Waits for the given time in milliseconds.
   * @param now Returns the current time in milliseconds.
   */
  public constructor(
    private readonly initialDelay: number,
    private readonly maxDelay: number,
    private readonly wait: (ms: number) => Promise<void> = sleep,
    private readonly now: () => number = Date.now,
  ) {
    this.delay = initialDelay;
  }

  /**
   * Register a rate limited request.
   * @return The new pause in milliseconds, or undefined if a parallel request already started one.
   */
  public hit(): number | undefined {
    if (this.now() < this.resumeAt) {
      return undefined;
    }
    const delay = this.delay;
    this.resumeAt = this.now() + delay;
    this.delay = Math.min(delay * 2, this.maxDelay);
    return delay;
  }

  /**
   * Register a successful request.
   * Requests that finish during a pause were sent before it, so they don't reset the delay.
   */
  public success(): void {
    if (this.now() >= this.resumeAt) {
      this.delay = this.initialDelay;
    }
  }

  /**
   * Wait until the current pause is over.
   */
  public async waitIfPaused(): Promise<void> {
    const remaining = this.resumeAt - this.now();
    if (remaining > 0) {
      await this.wait(remaining);
    }
  }
}
