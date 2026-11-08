import type { IGhbenchEntry } from '../lib/performanceComparison';
import {
  formatCount,
  formatRatio,
  formatTime,
  getFailures,
  getRows,
  INGESTION_METRICS,
  renderComparisonComment,
  renderIngestionRows,
} from '../lib/performanceComparison';

const [ TIME, MEMORY, STORE ] = INGESTION_METRICS;

const OPTIONS = { headSha: 'head', baseSha: 'base', runUrl: 'https://ci/1' };

function time(name: string, value: number, errors: boolean[] = [ false, false ]): IGhbenchEntry {
  return { name, unit: 'ms', value, extra: `Results: [1,1]; Error: [${errors.join(',')}]; HTTP Requests: [0,0]` };
}

function failures(suite: string, extra: string, value = 1): IGhbenchEntry {
  return { name: `${suite} - failed queries`, unit: 'failed instantiations', value, extra };
}

function ingestion(
  suite: string,
  time: number | null,
  memory: number,
  store: number,
  triples: number | null = 1_048_576,
): IGhbenchEntry[] {
  const extra = triples === null ? 'Runs: []' : `Triples: ${triples}; Runs: []`;
  return [
    { name: `${suite} - ingestion time`, unit: 'ms', value: time, extra },
    { name: `${suite} - memory after ingestion`, unit: 'MiB', value: memory, extra },
    { name: `${suite} - store size after ingestion`, unit: 'MiB', value: store, extra },
  ];
}

describe('formatRatio', () => {
  it('formats ratios with two decimals', () => {
    expect(formatRatio(120, 100)).toBe('1.20');
    expect(formatRatio(5, 100)).toBe('0.05');
    expect(formatRatio(1, 3)).toBe('0.33');
  });

  it('handles a zero previous value', () => {
    expect(formatRatio(0, 0)).toBe('1.00');
    expect(formatRatio(1, 0)).toBe('∞');
  });
});

describe('formatTime', () => {
  it('formats times with at most two decimals', () => {
    expect(formatTime(300)).toBe('300');
    expect(formatTime(2.5)).toBe('2.5');
    expect(formatTime(14.666_666_666_666_666)).toBe('14.67');
    expect(formatTime(0.1 + 0.2)).toBe('0.3');
  });
});

describe('getFailures', () => {
  it('reads failed queries entries', () => {
    expect(getFailures([
      failures('S', 'q1: 2/2 failed; q2: 1/2 failed; unexpected'),
      failures('T', 'None', 0),
      { name: 'U - failed queries', unit: 'failed instantiations', value: 0 },
    ])).toEqual(new Map([
      [ 'S - q1', { failed: 2, count: 2 }],
      [ 'S - q2', { failed: 1, count: 2 }],
    ]));
  });

  it('reads error flags of queries that are not in failed queries entries', () => {
    expect(getFailures([
      failures('S', 'q1: 1/2 failed'),
      time('S - q1', 10, [ true, false ]),
      time('S - q2', 10, [ true, true ]),
      time('S - q3', 10),
      { name: 'S - q4', unit: 'ms', value: 10 },
      { name: 'S - q5', unit: 'ms', value: 10, extra: 'Error: []' },
    ])).toEqual(new Map([
      [ 'S - q1', { failed: 1, count: 2 }],
      [ 'S - q2', { failed: 2, count: 2 }],
      [ 'S - q3', { failed: 0, count: 2 }],
      [ 'S - q4', { failed: 0, count: 0 }],
      [ 'S - q5', { failed: 0, count: 0 }],
    ]));
  });
});

describe('getRows', () => {
  it('combines queries of both sides', () => {
    expect(getRows(
      [ time('S - q1', 10), failures('S', 'q2: 2/2 failed'), time('S - q - x', 5) ],
      [ time('S - q1', 20), time('S - q2', 30), time('S - q3', 40) ],
    )).toEqual([
      {
        suite: 'S',
        query: 'q1',
        name: 'S - q1',
        head: { value: 10, unit: 'ms', failed: 0, count: 2 },
        base: { value: 20, unit: 'ms', failed: 0, count: 2 },
      },
      {
        suite: 'S',
        query: 'q - x',
        name: 'S - q - x',
        head: { value: 5, unit: 'ms', failed: 0, count: 2 },
        base: undefined,
      },
      {
        suite: 'S',
        query: 'q2',
        name: 'S - q2',
        head: { value: undefined, unit: 'ms', failed: 2, count: 2 },
        base: { value: 30, unit: 'ms', failed: 0, count: 2 },
      },
      {
        suite: 'S',
        query: 'q3',
        name: 'S - q3',
        head: undefined,
        base: { value: 40, unit: 'ms', failed: 0, count: 2 },
      },
    ]);
  });

  it('ignores queries that were not executed', () => {
    const skipped: IGhbenchEntry = { name: 'S - q2', unit: 'ms', value: null, extra: 'Error: []' };
    expect(getRows([ time('S - q1', 10), skipped ], [ time('S - q1', 20), skipped ]).map(row => row.name))
      .toEqual([ 'S - q1' ]);
    expect(getRows([ time('S - q1', 10) ], [ skipped ])[0].base).toBeUndefined();
  });

  it('treats queries that failed for all instantiations as without time', () => {
    expect(getRows([ time('S - q1', 0, [ true, true ]) ], [])[0].head)
      .toEqual({ value: undefined, unit: 'ms', failed: 2, count: 2 });
  });
});

describe('formatCount', () => {
  it('formats integers with thousands separators', () => {
    expect(formatCount(5)).toBe('5');
    expect(formatCount(1_048_576)).toBe('1,048,576');
  });
});

describe('renderIngestionRows', () => {
  const head = [ ...ingestion('A', 1000, 800, 400), ...ingestion('B', 500, 100, 50) ];
  const base = [ ...ingestion('A', 1250, 1000, 500), ...ingestion('C', 10, 20, 10) ];

  it('compares ingestion times of both sides, with their throughput', () => {
    expect(renderIngestionRows(head, base, TIME)).toEqual([
      '| `A` | 1,048,576 | `1000` ms (1,048,576 triples/s) | `1250` ms (838,861 triples/s) | `0.80` |',
      '| `B` | 1,048,576 | `500` ms (2,097,152 triples/s) |  |  |',
      '| `C` | 1,048,576 |  | `10` ms (104,857,600 triples/s) | n/a |',
    ]);
  });

  it('compares memory usage of both sides, with their bytes per triple', () => {
    expect(renderIngestionRows(head, base, MEMORY)).toEqual([
      '| `A` | 1,048,576 | `800` MiB (800 bytes/triple) | `1000` MiB (1,000 bytes/triple) | `0.80` |',
      '| `B` | 1,048,576 | `100` MiB (100 bytes/triple) |  |  |',
      '| `C` | 1,048,576 |  | `20` MiB (20 bytes/triple) | n/a |',
    ]);
  });

  it('compares store sizes of both sides, with their bytes per triple', () => {
    expect(renderIngestionRows(head, base, STORE)).toEqual([
      '| `A` | 1,048,576 | `400` MiB (400 bytes/triple) | `500` MiB (500 bytes/triple) | `0.80` |',
      '| `B` | 1,048,576 | `50` MiB (50 bytes/triple) |  |  |',
      '| `C` | 1,048,576 |  | `10` MiB (10 bytes/triple) | n/a |',
    ]);
  });

  it('marks missing metrics of measured suites, and differing numbers of triples', () => {
    const headEntries = ingestion('A', null, 800, 400);
    const baseEntries = [ ingestion('A', 1000, 1000, 500, 2_097_152)[1] ];
    expect(renderIngestionRows(headEntries, baseEntries, TIME)).toEqual([
      '| `A` | 1,048,576 | missing | missing | n/a |',
    ]);
    expect(renderIngestionRows(headEntries, baseEntries, MEMORY)).toEqual([
      '| `A` | 1,048,576 (base: 2,097,152) | `800` MiB (800 bytes/triple) | `1000` MiB (500 bytes/triple) | `0.80` |',
    ]);
    expect(renderIngestionRows(headEntries, baseEntries, STORE)).toEqual([
      '| `A` | 1,048,576 | `400` MiB (400 bytes/triple) | missing | n/a |',
    ]);
  });

  it('omits unavailable derived metrics', () => {
    const entries = [ ...ingestion('A', 0, 5, 2, 0), ...ingestion('B', 10, 20, 4, null) ];
    expect(renderIngestionRows(entries, [], TIME)).toEqual([
      '| `A` | 0 | `0` ms |  |  |',
      '| `B` |  | `10` ms |  |  |',
    ]);
    expect(renderIngestionRows(entries, [], MEMORY)).toEqual([
      '| `A` | 0 | `5` MiB |  |  |',
      '| `B` |  | `20` MiB |  |  |',
    ]);
    expect(renderIngestionRows(entries, [], STORE)).toEqual([
      '| `A` | 0 | `2` MiB |  |  |',
      '| `B` |  | `4` MiB |  |  |',
    ]);
  });
});

describe('renderComparisonComment', () => {
  it('renders fractional times', () => {
    expect(renderComparisonComment(
      [ time('A - q1', 1.5), time('A - q2', 2.333_333) ],
      [ time('A - q1', 1.25), time('A - q2', 2) ],
      OPTIONS,
    )).toContain(`| \`A\` | \`3.83\` ms | \`3.25\` ms | \`1.18\` |`);
  });

  it('renders a comparison without failures', () => {
    expect(renderComparisonComment(
      [ time('A - q1', 100), time('A - q2', 200), time('B - q1', 5) ],
      [ time('A - q1', 50), time('A - q2', 250), time('B - q1', 5) ],
      OPTIONS,
    )).toBe(`<!-- performance-comparison -->

# Benchmarks total results

| Benchmark suite | Current: head | Base: base | Ratio |
|-|-|-|-|
| \`A\` | \`300\` ms | \`300\` ms | \`1.00\` |
| \`B\` | \`5\` ms | \`5\` ms | \`1.00\` |

<details>
<summary>Show detailed results</summary>

| Benchmark suite | Current: head | Base: base | Ratio |
|-|-|-|-|
| \`A - q1\` | \`100\` ms | \`50\` ms | \`2.00\` |
| \`A - q2\` | \`200\` ms | \`250\` ms | \`0.80\` |
| \`B - q1\` | \`5\` ms | \`5\` ms | \`1.00\` |

</details>

Measured by [this CI run](https://ci/1).
`);
  });

  it('renders failures per side, and excludes them from the totals', () => {
    expect(renderComparisonComment(
      [
        time('A - ok', 100),
        failures('A', 'broken: 2/2 failed; partial: 1/2 failed; both: 2/2 failed'),
        time('A - fixed', 30),
        time('A - partial', 40, [ true, false ]),
        time('A - new', 50),
        time('B - ok', 5),
        failures('B', 'both: 2/2 failed'),
      ],
      [
        time('A - ok', 200),
        time('A - broken', 10),
        failures('A', 'fixed: 2/2 failed; both: 2/2 failed'),
        time('A - partial', 20),
        time('B - ok', 5),
        failures('B', 'both: 2/2 failed'),
      ],
      OPTIONS,
    )).toBe(`<!-- performance-comparison -->

# Benchmarks total results

| Benchmark suite | Current: head | Base: base | Ratio |
|-|-|-|-|
| \`A\` | \`100\` ms | \`200\` ms | \`0.50\` |
| \`B\` | \`5\` ms | \`5\` ms | \`1.00\` |

\`A\` totals exclude queries that failed or are missing on either side: fixed, partial, new, broken, both

\`B\` totals exclude queries that failed or are missing on either side: both

:warning: Queries failing in this pull request, but not on the base:
- \`A\`: partial, broken

:white_check_mark: Queries failing on the base, but not in this pull request:
- \`A\`: fixed

:x: Queries failing on both sides:
- \`A\`: both
- \`B\`: both

<details>
<summary>Show detailed results</summary>

| Benchmark suite | Current: head | Base: base | Ratio |
|-|-|-|-|
| \`A - ok\` | \`100\` ms | \`200\` ms | \`0.50\` |
| \`A - fixed\` | \`30\` ms | failed | n/a |
| \`A - partial\` | \`40\` ms (1 failed) | \`20\` ms | n/a |
| \`A - new\` | \`50\` ms | missing | n/a |
| \`B - ok\` | \`5\` ms | \`5\` ms | \`1.00\` |
| \`A - broken\` | failed | \`10\` ms | n/a |
| \`A - both\` | failed | failed | n/a |
| \`B - both\` | failed | failed | n/a |

</details>

Measured by [this CI run](https://ci/1).
`);
  });

  it('renders suites without base results, or without comparable queries', () => {
    expect(renderComparisonComment(
      [ time('A - q1', 10), time('A - q2', 0, [ true, true ]), time('B - q1', 20, [ true, false ]) ],
      [ time('B - q1', 30), time('C - q1', 40) ],
      OPTIONS,
    )).toBe(`<!-- performance-comparison -->

# Benchmarks total results

| Benchmark suite | Current: head | Base: base | Ratio |
|-|-|-|-|
| \`A\` | \`10\` ms |  |  |
| \`B\` |  |  | n/a |
| \`C\` |  |  | n/a |

\`A\` totals exclude queries that failed or are missing on either side: q2

\`B\` totals exclude queries that failed or are missing on either side: q1

\`C\` totals exclude queries that failed or are missing on either side: q1

:warning: Queries failing in this pull request, but not on the base:
- \`B\`: q1

<details>
<summary>Show detailed results</summary>

| Benchmark suite | Current: head | Base: base | Ratio |
|-|-|-|-|
| \`A - q1\` | \`10\` ms |  |  |
| \`A - q2\` | failed |  |  |
| \`B - q1\` | \`20\` ms (1 failed) | \`30\` ms | n/a |
| \`C - q1\` |  | \`40\` ms | n/a |

</details>

Measured by [this CI run](https://ci/1).
`);
  });
  it('renders ingestion results in a table per metric', () => {
    expect(renderComparisonComment(
      [ time('A - q1', 100) ],
      [ time('A - q1', 50) ],
      OPTIONS,
      { head: ingestion('A', 1000, 800, 400), base: ingestion('A', 1250, 1000, 500) },
    )).toBe(`<!-- performance-comparison -->

# Benchmarks total results

| Benchmark suite | Current: head | Base: base | Ratio |
|-|-|-|-|
| \`A\` | \`100\` ms | \`50\` ms | \`2.00\` |

<details>
<summary>Show detailed results</summary>

| Benchmark suite | Current: head | Base: base | Ratio |
|-|-|-|-|
| \`A - q1\` | \`100\` ms | \`50\` ms | \`2.00\` |

</details>

# Ingestion time

| Benchmark suite | Triples | Current: head | Base: base | Ratio |
|-|-|-|-|-|
| \`A\` | 1,048,576 | \`1000\` ms (1,048,576 triples/s) | \`1250\` ms (838,861 triples/s) | \`0.80\` |

# Memory after ingestion

| Benchmark suite | Triples | Current: head | Base: base | Ratio |
|-|-|-|-|-|
| \`A\` | 1,048,576 | \`800\` MiB (800 bytes/triple) | \`1000\` MiB (1,000 bytes/triple) | \`0.80\` |

# Store size after ingestion

| Benchmark suite | Triples | Current: head | Base: base | Ratio |
|-|-|-|-|-|
| \`A\` | 1,048,576 | \`400\` MiB (400 bytes/triple) | \`500\` MiB (500 bytes/triple) | \`0.80\` |

Measured by [this CI run](https://ci/1).
`);
  });

  it('omits ingestion results if none were measured', () => {
    expect(renderComparisonComment([ time('A - q1', 100) ], [ time('A - q1', 50) ], OPTIONS, { head: [], base: []}))
      .toBe(renderComparisonComment([ time('A - q1', 100) ], [ time('A - q1', 50) ], OPTIONS));
  });
});
