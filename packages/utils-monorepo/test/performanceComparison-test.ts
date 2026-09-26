import type { IGhbenchEntry } from '../lib/performanceComparison';
import { formatRatio, getFailures, getRows, renderComparisonComment } from '../lib/performanceComparison';

const OPTIONS = { headSha: 'head', baseSha: 'base', runUrl: 'https://ci/1' };

function time(name: string, value: number, errors: boolean[] = [ false, false ]): IGhbenchEntry {
  return { name, unit: 'ms', value, extra: `Results: [1,1]; Error: [${errors.join(',')}]; HTTP Requests: [0,0]` };
}

function failures(suite: string, extra: string, value = 1): IGhbenchEntry {
  return { name: `${suite} - failed queries`, unit: 'failed instantiations', value, extra };
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

  it('treats queries that failed for all instantiations as without time', () => {
    expect(getRows([ time('S - q1', 0, [ true, true ]) ], [])[0].head)
      .toEqual({ value: undefined, unit: 'ms', failed: 2, count: 2 });
  });
});

describe('renderComparisonComment', () => {
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
});
