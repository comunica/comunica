// eslint-disable-next-line import/no-nodejs-modules
import { availableParallelism } from 'node:os';

// eslint-disable-next-line import/no-nodejs-modules
import { join } from 'node:path';

// eslint-disable-next-line import/no-nodejs-modules
import { parseArgs } from 'node:util';
import { readJson } from 'fs-extra';
import type { NpmRunner } from './npmCli';
import {
  assertNpmStageSupport,
  getPublicPackages,
  isRateLimitError,
  listStaged,
  npmErrorMessage,
  parseConcurrency,
  promptTerminal,
  RateLimitBackoff,
  runNpm,
} from './npmCli';

export interface IStageReleaseOptions {
  /**
   * The monorepo directory.
   */
  cwd: string;
  /**
   * Stage the packages that have this version.
   */
  version: string;
  /**
   * The dist-tag for the staged versions, instead of npm's default.
   */
  tag?: string;
  /**
   * The number of packages that are staged in parallel.
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
 * Check if npm refused to stage a version because it is already staged or published.
 * @param stderr The stderr output of an npm command.
 */
export function isAlreadyStagedError(stderr: string): boolean {
  return /\bE409\b|cannot publish over|previously published|already (?:staged|published|exists)/iu.test(stderr);
}

/**
 * Stage all non-private packages of a monorepo that have the given version.
 * Versions that are already staged are skipped, so this can be run again after a failure.
 * When npm rate limits, all requests pause and are retried afterwards.
 * @param options The options.
 * @return If all packages were staged.
 */
export async function stageRelease(options: IStageReleaseOptions): Promise<boolean> {
  const { npm, prompt, log, backoff, version } = options;

  await assertNpmStageSupport(npm);
  const packages = (await getPublicPackages(options.cwd)).filter(pkg => pkg.version === version);
  if (packages.length === 0) {
    log(`No packages found at version ${version}.`);
    return true;
  }
  const stagedLabels = new Set((await listStaged(npm)).map(item => `${item.packageName}@${item.version}`));
  const queue = packages.filter(pkg => !stagedLabels.has(`${pkg.name}@${pkg.version}`));
  const alreadyStaged = packages.length - queue.length;
  log(`Found ${packages.length} packages at version ${version}${alreadyStaged > 0 ? `, of which ${alreadyStaged} are already staged` : ''}.`);
  if (queue.length === 0) {
    return true;
  }

  const total = queue.length;
  if (!options.yes && !/^y(?:es)?$/iu.test(await prompt(`Stage ${total}${options.tag ? ` with tag ${options.tag}` : ''}? [y/N] `))) {
    log('Aborted.');
    return true;
  }

  // Without --workspaces=false, npm loads every workspace of the monorepo on each run, which doubles its startup time.
  const args = [ 'stage', 'publish', '--workspaces=false', ...options.tag ? [ '--tag', options.tag ] : [] ];
  const failures: string[] = [];
  const skipped: string[] = [];
  let staged = 0;

  await Promise.all(Array.from({ length: options.concurrency }, async() => {
    while (queue.length > 0) {
      const pkg = queue.shift()!;
      const label = `${pkg.name}@${pkg.version}`;
      await backoff.waitIfPaused();
      const result = await npm(args, pkg.dir);
      if (result.code === 0) {
        backoff.success();
        staged++;
        log(`[${staged}/${total}] Staged ${label}`);
      } else if (isRateLimitError(result.stderr)) {
        queue.unshift(pkg);
        const delay = backoff.hit();
        if (delay !== undefined) {
          log(`npm is rate limiting (${npmErrorMessage(result.stderr)}), so waiting ${delay / 1000}s before continuing (${staged}/${total} staged).`);
        }
      } else if (isAlreadyStagedError(result.stderr)) {
        skipped.push(label);
      } else {
        failures.push(`${label}: ${npmErrorMessage(result.stderr)}`);
      }
    }
  }));

  log(`Staged ${staged} of ${total} packages.`);
  if (skipped.length > 0) {
    log(`Skipped ${skipped.length} that were already staged or published:\n${skipped.map(label => `  ${label}`).join('\n')}`);
  }
  if (failures.length > 0) {
    log(`Failed to stage ${failures.length}:\n${failures.map(failure => `  ${failure}`).join('\n')}`);
  }
  return failures.length === 0;
}

/**
 * Run stageRelease from command line arguments.
 * @param argv The command line arguments, without the node binary and script.
 * @param cwd The monorepo directory.
 * @return If all packages were staged.
 */
export async function stageReleaseCli(argv: string[], cwd: string): Promise<boolean> {
  const { values } = parseArgs({
    args: argv,
    options: {
      version: { type: 'string' },
      tag: { type: 'string' },
      // Like lerna, use all CPUs by default: npm's startup is CPU-bound, and the backoff handles rate limits.
      concurrency: { type: 'string', default: String(availableParallelism()) },
      yes: { type: 'boolean', short: 'y', default: false },
    },
  });
  const concurrency = parseConcurrency(values.concurrency);
  const version: string = values.version ?? (await readJson(join(cwd, 'lerna.json'))).version;
  return stageRelease({
    cwd,
    version,
    tag: values.tag,
    concurrency,
    yes: values.yes,
    npm: runNpm,
    prompt: promptTerminal,
    // eslint-disable-next-line no-console
    log: message => console.log(message),
    backoff: new RateLimitBackoff(30_000, 300_000),
  });
}
