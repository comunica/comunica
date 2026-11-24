import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as Path from 'node:path';
import { gzipSync } from 'node:zlib';
import type { IBundleSizeEntry } from '../lib/bundleSizes';
import {
  formatBytes,
  formatChange,
  getRows,
  measureBundleSizes,
  renderBundleSizeComment,
} from '../lib/bundleSizes';

const OPTIONS = { headSha: 'head', baseSha: 'base', runUrl: 'https://ci/1', historyUrl: 'https://history/' };

function sizes(bundle: string, minified: number, gzipped: number): IBundleSizeEntry[] {
  return [
    { name: `${bundle} - minified`, unit: 'bytes', value: minified },
    { name: `${bundle} - gzipped`, unit: 'bytes', value: gzipped },
  ];
}

describe('measureBundleSizes', () => {
  let monorepo: string;

  beforeEach(() => {
    monorepo = mkdtempSync(Path.join(tmpdir(), 'bundle-sizes-'));
  });

  afterEach(() => {
    rmSync(monorepo, { recursive: true, force: true });
  });

  function writeBundle(engine: string, file: string, contents: string): void {
    mkdirSync(Path.join(monorepo, 'engines', engine), { recursive: true });
    writeFileSync(Path.join(monorepo, 'engines', engine, file), contents);
  }

  it('measures the bundles of all engines', () => {
    const contents = 'var Comunica = 1;'.repeat(100);
    const gzipped = gzipSync(contents, { level: 9 }).length;
    writeBundle('b', 'comunica-browser.js', contents);
    writeBundle('a', 'comunica-browser-vite.js', 'a');
    writeBundle('a', 'comunica-browser.js', contents);
    writeBundle('a', 'comunica-browser.js.map', 'ignored');
    mkdirSync(Path.join(monorepo, 'engines', 'config-a'));
    expect(measureBundleSizes(monorepo)).toEqual([
      ...sizes('a (webpack)', 1_700, gzipped),
      ...sizes('a (vite)', 1, 21),
      ...sizes('b (webpack)', 1_700, gzipped),
    ]);
  });

  it('throws if no bundles were built', () => {
    mkdirSync(Path.join(monorepo, 'engines', 'a'), { recursive: true });
    expect(() => measureBundleSizes(monorepo)).toThrow('No browser bundles were found in');
  });
});

describe('formatBytes', () => {
  it('formats small sizes in bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(999)).toBe('999 B');
    expect(formatBytes(-999)).toBe('-999 B');
  });

  it('formats large sizes in kB', () => {
    expect(formatBytes(1_000)).toBe('1.00 kB');
    expect(formatBytes(2_389_931)).toBe('2389.93 kB');
    expect(formatBytes(-1_500)).toBe('-1.50 kB');
  });

  it('formats signed sizes', () => {
    expect(formatBytes(5, true)).toBe('+5 B');
    expect(formatBytes(1_234, true)).toBe('+1.23 kB');
    expect(formatBytes(-5, true)).toBe('-5 B');
  });
});

describe('formatChange', () => {
  it('formats unchanged sizes', () => {
    expect(formatChange(100, 100)).toBe('`0 B`');
  });

  it('formats changes with their percentage', () => {
    expect(formatChange(1_100, 1_000)).toBe('`+100 B` (+10.00%)');
    expect(formatChange(900, 1_000)).toBe('`-100 B` (-10.00%)');
    expect(formatChange(2_391_000, 2_389_931)).toBe('`+1.07 kB` (+0.04%)');
  });

  it('omits the percentage for a zero previous size', () => {
    expect(formatChange(5, 0)).toBe('`+5 B`');
  });
});

describe('getRows', () => {
  it('combines bundles of both sides', () => {
    expect(getRows(
      [ ...sizes('a (webpack)', 10, 5), ...sizes('b (webpack)', 20, 10), { name: 'other', unit: 'bytes', value: 1 }],
      [ ...sizes('a (webpack)', 11, 6), ...sizes('c (webpack)', 30, 15) ],
    )).toEqual([
      { bundle: 'a (webpack)', head: { minified: 10, gzipped: 5 }, base: { minified: 11, gzipped: 6 }},
      { bundle: 'b (webpack)', head: { minified: 20, gzipped: 10 }, base: undefined },
      { bundle: 'c (webpack)', head: undefined, base: { minified: 30, gzipped: 15 }},
    ]);
  });
});

describe('renderBundleSizeComment', () => {
  it('renders changed, new, and removed bundles', () => {
    expect(renderBundleSizeComment(
      [
        ...sizes('a (webpack)', 2_391_000, 600_100),
        ...sizes('a (vite)', 1_000, 500),
        ...sizes('b (webpack)', 1_200, 600),
      ],
      [
        ...sizes('a (webpack)', 2_389_931, 600_000),
        ...sizes('a (vite)', 1_000, 500),
        ...sizes('c (webpack)', 1_500, 700),
      ],
      OPTIONS,
    )).toBe(`<!-- bundle-size-comparison -->

# Bundle sizes

3 of 4 bundles changed in size.

| Bundle | Minified | Change | Gzipped | Change |
|-|-|-|-|-|
| \`a (webpack)\` | \`2391.00 kB\` | \`+1.07 kB\` (+0.04%) | \`600.10 kB\` | \`+100 B\` (+0.02%) |
| \`a (vite)\` | \`1.00 kB\` | \`0 B\` | \`500 B\` | \`0 B\` |
| \`b (webpack)\` | \`1.20 kB\` | new | \`600 B\` | new |
| \`c (webpack)\` | removed |  | removed |  |

Sizes are of head, and changes are relative to the base commit base.
To inspect what a webpack bundle contains, run \`yarn run browser-profile\` in its engine package.

See the [history of the base branch](https://history/). Measured by [this CI run](https://ci/1).
`);
  });

  it('renders unchanged bundles', () => {
    expect(renderBundleSizeComment(
      sizes('a (webpack)', 1_000, 500),
      sizes('a (webpack)', 1_000, 500),
      OPTIONS,
    )).toContain('No bundle sizes changed.\n\n| Bundle |');
  });
});
