// eslint-disable-next-line import/no-nodejs-modules
import { existsSync, readdirSync, readFileSync } from 'node:fs';

// eslint-disable-next-line import/no-nodejs-modules
import * as Path from 'node:path';

// eslint-disable-next-line import/no-nodejs-modules
import { constants, gzipSync } from 'node:zlib';

/**
 * A bundle size, in the format of the customSmallerIsBetter tool of github-action-benchmark.
 */
export interface IBundleSizeEntry {
  name: string;
  unit: string;
  value: number;
}

export type BundleSizeMetric = 'minified' | 'gzipped';

/**
 * The sizes of a bundle on one side of the comparison, where a metric is undefined if it is missing.
 */
export type IBundleSizes = Partial<Record<BundleSizeMetric, number>>;

/**
 * A bundle compared across both sides, where a side is undefined if the bundle is missing there.
 */
export interface IBundleSizeRow {
  bundle: string;
  head: IBundleSizes | undefined;
  base: IBundleSizes | undefined;
}

export interface IBundleSizeComparisonOptions {
  headSha: string;
  baseSha: string;
  runUrl: string;
  historyUrl: string;
}

/**
 * The bundle file that each bundler emits in the package directory of an engine.
 */
export const BUNDLE_FILES: [string, string][] = [
  [ 'webpack', 'comunica-browser.js' ],
  [ 'vite', 'comunica-browser-vite.js' ],
];

const METRICS: BundleSizeMetric[] = [ 'minified', 'gzipped' ];

const ENTRY_NAME_REGEX = /^(.*) - (minified|gzipped)$/u;

/**
 * Measure the browser bundles of all engines in a monorepo, of which the bundles have been built.
 * @param monorepoPath The path to the monorepo.
 */
export function measureBundleSizes(monorepoPath: string): IBundleSizeEntry[] {
  const enginesPath = Path.join(monorepoPath, 'engines');
  const entries = readdirSync(enginesPath)
    .sort((left, right) => left.localeCompare(right))
    .flatMap(engine => BUNDLE_FILES.flatMap(([ bundler, file ]) => {
      const path = Path.join(enginesPath, engine, file);
      if (!existsSync(path)) {
        return [];
      }
      const contents = readFileSync(path);
      const bundle = `${engine} (${bundler})`;
      return [
        { name: `${bundle} - minified`, unit: 'bytes', value: contents.length },
        {
          name: `${bundle} - gzipped`,
          unit: 'bytes',
          value: gzipSync(contents, { level: constants.Z_BEST_COMPRESSION }).length,
        },
      ];
    }));
  if (entries.length === 0) {
    throw new Error(`No browser bundles were found in ${enginesPath}`);
  }
  return entries;
}

/**
 * Format a size in bytes, or in kB with two decimals from 1000 bytes onwards.
 * @param bytes The size in bytes.
 * @param signed If positive sizes must be prefixed with a plus sign.
 */
export function formatBytes(bytes: number, signed = false): string {
  const sign = signed && bytes > 0 ? '+' : '';
  if (Math.abs(bytes) < 1000) {
    return `${sign}${bytes} B`;
  }
  return `${sign}${(bytes / 1000).toFixed(2)} kB`;
}

/**
 * Format the change between two sizes, with its percentage relative to the previous size.
 * @param current The current size.
 * @param previous The previous size.
 */
export function formatChange(current: number, previous: number): string {
  const difference = current - previous;
  if (difference === 0) {
    return '`0 B`';
  }
  const percentage = previous === 0 ?
    '' :
    ` (${difference > 0 ? '+' : ''}${(difference * 100 / previous).toFixed(2)}%)`;
  return `\`${formatBytes(difference, true)}\`${percentage}`;
}

function groupByBundle(entries: IBundleSizeEntry[]): Map<string, IBundleSizes> {
  const bundles = new Map<string, IBundleSizes>();
  for (const entry of entries) {
    const match = ENTRY_NAME_REGEX.exec(entry.name);
    if (match) {
      const sizes = bundles.get(match[1]) ?? {};
      sizes[<BundleSizeMetric> match[2]] = entry.value;
      bundles.set(match[1], sizes);
    }
  }
  return bundles;
}

/**
 * Combine the entries of both sides into rows, one per bundle.
 * @param headEntries The bundle sizes of the pull request.
 * @param baseEntries The bundle sizes of the base commit.
 */
export function getRows(headEntries: IBundleSizeEntry[], baseEntries: IBundleSizeEntry[]): IBundleSizeRow[] {
  const headBundles = groupByBundle(headEntries);
  const baseBundles = groupByBundle(baseEntries);
  return [ ...new Set([ ...headBundles.keys(), ...baseBundles.keys() ]) ]
    .map(bundle => ({ bundle, head: headBundles.get(bundle), base: baseBundles.get(bundle) }));
}

function formatCells(row: IBundleSizeRow, metric: BundleSizeMetric): string[] {
  const head = row.head?.[metric];
  const base = row.base?.[metric];
  if (head === undefined) {
    return [ 'removed', '' ];
  }
  return [ `\`${formatBytes(head)}\``, base === undefined ? 'new' : formatChange(head, base) ];
}

function isChanged(row: IBundleSizeRow): boolean {
  return METRICS.some(metric => row.head?.[metric] !== row.base?.[metric]);
}

/**
 * Render the bundle size comparison comment of a pull request.
 * @param headEntries The bundle sizes of the pull request.
 * @param baseEntries The bundle sizes of the base commit.
 * @param options The commits and CI run that are compared, and where the history of the base branch is shown.
 */
export function renderBundleSizeComment(
  headEntries: IBundleSizeEntry[],
  baseEntries: IBundleSizeEntry[],
  options: IBundleSizeComparisonOptions,
): string {
  const rows = getRows(headEntries, baseEntries);
  const changed = rows.filter(isChanged).length;
  const summary = changed === 0 ?
    'No bundle sizes changed.' :
    `${changed} of ${rows.length} bundles changed in size.`;
  const table = [
    '| Bundle | Minified | Change | Gzipped | Change |',
    '|-|-|-|-|-|',
    ...rows.map(row => `| ${[
      `\`${row.bundle}\``,
      ...METRICS.flatMap(metric => formatCells(row, metric)),
    ].join(' | ')} |`),
  ].join('\n');
  return [
    '<!-- bundle-size-comparison -->\n\n# Bundle sizes\n\n',
    `${summary}\n\n`,
    table,
    `\n\nSizes are of ${options.headSha}, and changes are relative to the base commit ${options.baseSha}.\n`,
    'To inspect what a webpack bundle contains, run `yarn run browser-profile` in its engine package.\n\n',
    `See the [history of the base branch](${options.historyUrl}). Measured by [this CI run](${options.runUrl}).\n`,
  ].join('');
}
