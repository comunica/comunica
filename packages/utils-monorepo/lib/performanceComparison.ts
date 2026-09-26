/**
 * An entry of a JSON file produced by `psbr csv ghbench --detailed --failures`.
 */
export interface IGhbenchEntry {
  name: string;
  unit: string;
  value: number;
  extra?: string;
}

/**
 * The results of a query on one side of the comparison.
 */
export interface IQuerySide {
  /**
   * The time, or undefined if all instantiations failed.
   */
  value: number | undefined;
  unit: string;
  failed: number;
  count: number;
}

/**
 * A query compared across both sides, where a side is undefined if the query is missing there.
 */
export interface IQueryRow {
  suite: string;
  query: string;
  name: string;
  head: IQuerySide | undefined;
  base: IQuerySide | undefined;
}

export interface IComparisonOptions {
  headSha: string;
  baseSha: string;
  runUrl: string;
}

const FAILURES_SUFFIX = ' - failed queries';

function isFailuresEntry(entry: IGhbenchEntry): boolean {
  return entry.name.endsWith(FAILURES_SUFFIX);
}

function getSuite(name: string): string {
  return name.split(' - ')[0];
}

function getQuery(name: string): string {
  return name.split(' - ').slice(1).join(' - ');
}

/**
 * Format a ratio with two decimals, which is below 1 if current is faster.
 * @param current The current time.
 * @param previous The previous time.
 */
export function formatRatio(current: number, previous: number): string {
  if (previous === 0) {
    return current === 0 ? '1.00' : '∞';
  }
  const hundredths = Math.round(current * 100 / previous);
  return `${Math.floor(hundredths / 100)}.${String(hundredths % 100).padStart(2, '0')}`;
}

/**
 * Determine the failed and total instantiations per query of one side.
 * psbr omits queries that failed for all instantiations, and lists them in its failed queries entries.
 * Otherwise, the error flags per instantiation are listed in the extra field of each query.
 * @param entries The ghbench entries of one side.
 */
export function getFailures(entries: IGhbenchEntry[]): Map<string, { failed: number; count: number }> {
  const failures = new Map<string, { failed: number; count: number }>();
  for (const entry of entries.filter(isFailuresEntry)) {
    const suite = entry.name.slice(0, -FAILURES_SUFFIX.length);
    for (const part of entry.extra === 'None' ? [] : (entry.extra ?? '').split('; ')) {
      const match = /^(.*): (\d+)\/(\d+) failed$/u.exec(part);
      if (match) {
        failures.set(`${suite} - ${match[1]}`, { failed: Number(match[2]), count: Number(match[3]) });
      }
    }
  }
  for (const entry of entries.filter(entry => !isFailuresEntry(entry))) {
    if (!failures.has(entry.name)) {
      const flags = /Error: \[([^\]]*)\]/u.exec(entry.extra ?? '')?.[1];
      const errors = flags ? flags.split(',') : [];
      failures.set(entry.name, { failed: errors.filter(error => error === 'true').length, count: errors.length });
    }
  }
  return failures;
}

/**
 * Combine the entries of both sides into rows, one per query.
 * @param headEntries The ghbench entries of the pull request.
 * @param baseEntries The ghbench entries of the base commit.
 */
export function getRows(headEntries: IGhbenchEntry[], baseEntries: IGhbenchEntry[]): IQueryRow[] {
  const headTimes = new Map(headEntries.filter(entry => !isFailuresEntry(entry)).map(entry => [ entry.name, entry ]));
  const baseTimes = new Map(baseEntries.filter(entry => !isFailuresEntry(entry)).map(entry => [ entry.name, entry ]));
  const headFailures = getFailures(headEntries);
  const baseFailures = getFailures(baseEntries);
  const names = new Set([ ...headTimes.keys(), ...baseTimes.keys(), ...headFailures.keys(), ...baseFailures.keys() ]);
  return [ ...names ].map(name => ({
    suite: getSuite(name),
    query: getQuery(name),
    name,
    head: getSide(headTimes, headFailures, name),
    base: getSide(baseTimes, baseFailures, name),
  }));
}

function getSide(
  times: Map<string, IGhbenchEntry>,
  failures: Map<string, { failed: number; count: number }>,
  name: string,
): IQuerySide | undefined {
  // Every query with a time also has an entry in the failures
  const failure = failures.get(name);
  if (!failure) {
    return undefined;
  }
  const time = times.get(name);
  const allFailed = failure.failed > 0 && failure.failed === failure.count;
  return {
    value: time && !allFailed ? time.value : undefined,
    unit: 'ms',
    failed: failure.failed,
    count: failure.count,
  };
}

function isOk(side: IQuerySide | undefined): side is IQuerySide & { value: number } {
  return side !== undefined && side.failed === 0;
}

function isFailing(side: IQuerySide | undefined): boolean {
  return side !== undefined && side.failed > 0;
}

function formatCell(side: IQuerySide | undefined, hasSuite: boolean): string {
  if (!side) {
    return hasSuite ? 'missing' : '';
  }
  if (side.value === undefined) {
    return 'failed';
  }
  if (side.failed > 0) {
    return `\`${side.value}\` ${side.unit} (${side.failed} failed)`;
  }
  return `\`${side.value}\` ${side.unit}`;
}

function formatRow(cells: string[]): string {
  return `| ${cells.join(' | ')} |`;
}

/**
 * Render the comparison comment of a pull request.
 * @param headEntries The ghbench entries of the pull request.
 * @param baseEntries The ghbench entries of the base commit.
 * @param options The commits and CI run that are compared.
 */
export function renderComparisonComment(
  headEntries: IGhbenchEntry[],
  baseEntries: IGhbenchEntry[],
  options: IComparisonOptions,
): string {
  const rows = getRows(headEntries, baseEntries);
  const suites = [ ...new Set(rows.map(row => row.suite)) ];
  const headSuites = new Set(headEntries.map(entry => getSuite(entry.name)));
  const baseSuites = new Set(baseEntries.map(entry => getSuite(entry.name)));
  const header = [
    formatRow([ 'Benchmark suite', `Current: ${options.headSha}`, `Base: ${options.baseSha}`, 'Ratio' ]),
    '|-|-|-|-|',
  ];

  // Totals only include queries that succeeded on both sides
  const totalRows: string[] = [];
  const exclusions: string[] = [];
  for (const suite of suites) {
    const hasBase = baseSuites.has(suite);
    const suiteRows = rows.filter(row => row.suite === suite);
    const included = suiteRows.flatMap(row => isOk(row.head) && (!hasBase || isOk(row.base)) ?
        [{ row, head: row.head.value, base: row.base?.value ?? 0 }] :
        []);
    const headTotal = included.reduce((sum, entry) => sum + entry.head, 0);
    const baseTotal = included.reduce((sum, entry) => sum + entry.base, 0);
    if (!hasBase) {
      totalRows.push(formatRow([ `\`${suite}\``, `\`${headTotal}\` ms`, '', '' ]));
    } else if (included.length === 0) {
      totalRows.push(formatRow([ `\`${suite}\``, '', '', 'n/a' ]));
    } else {
      totalRows.push(formatRow([
        `\`${suite}\``,
        `\`${headTotal}\` ms`,
        `\`${baseTotal}\` ms`,
        `\`${formatRatio(headTotal, baseTotal)}\``,
      ]));
    }
    const excluded = suiteRows.filter(row => !included.some(entry => entry.row === row)).map(row => row.query);
    if (excluded.length > 0) {
      exclusions.push(`\n\`${suite}\` totals exclude queries that failed or are missing on either side: ${excluded.join(', ')}`);
    }
  }

  // Queries with failures per side, for suites that both sides ran
  const compared = rows.filter(row => headSuites.has(row.suite) && baseSuites.has(row.suite));
  const failureSections: [string, IQueryRow[]][] = [
    [
      ':warning: Queries failing in this pull request, but not on the base',
      compared.filter(row => isFailing(row.head) && !isFailing(row.base)),
    ],
    [
      ':white_check_mark: Queries failing on the base, but not in this pull request',
      compared.filter(row => !isFailing(row.head) && isFailing(row.base)),
    ],
    [ ':x: Queries failing on both sides', compared.filter(row => isFailing(row.head) && isFailing(row.base)) ],
  ];
  const failures = failureSections
    .filter(([ , sectionRows ]) => sectionRows.length > 0)
    .map(([ title, sectionRows ]) => `${title}:\n${suites
      .filter(suite => sectionRows.some(row => row.suite === suite))
      .map(suite => `- \`${suite}\`: ${sectionRows.filter(row => row.suite === suite).map(row => row.query).join(', ')}`)
      .join('\n')}`)
    .join('\n\n');

  const detailRows = rows.map((row) => {
    const hasBase = baseSuites.has(row.suite);
    let ratio = '';
    if (isOk(row.head) && isOk(row.base)) {
      ratio = `\`${formatRatio(row.head.value, row.base.value)}\``;
    } else if (hasBase) {
      ratio = 'n/a';
    }
    return formatRow([
      `\`${row.name}\``,
      formatCell(row.head, headSuites.has(row.suite)),
      formatCell(row.base, hasBase),
      ratio,
    ]);
  });

  return [
    '<!-- performance-comparison -->\n\n# Benchmarks total results\n\n',
    [ ...header, ...totalRows, ...exclusions ].join('\n'),
    failures ? `\n\n${failures}` : '',
    '\n\n<details>\n<summary>Show detailed results</summary>\n\n',
    [ ...header, ...detailRows ].join('\n'),
    `\n\n</details>\n\nMeasured by [this CI run](${options.runUrl}).\n`,
  ].join('');
}
