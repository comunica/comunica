import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  countTriples,
  getBytesPerTriple,
  getThroughput,
  getTriples,
  median,
  toIngestionEntries,
} from '../lib/performanceIngestion';

const MIB = 1024 * 1024;

describe('median', () => {
  it('determines the median of an odd number of values', () => {
    expect(median([ 3, 1, 2 ])).toBe(2);
    expect(median([ 5 ])).toBe(5);
  });

  it('determines the median of an even number of values', () => {
    expect(median([ 4, 1, 3, 2 ])).toBe(2.5);
  });

  it('does not modify the values', () => {
    const values = [ 3, 1, 2 ];
    median(values);
    expect(values).toEqual([ 3, 1, 2 ]);
  });

  it('throws on no values', () => {
    expect(() => median([])).toThrow('Cannot determine the median of no values');
  });
});

describe('countTriples', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'performance-ingestion-test-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('counts non-empty non-comment lines, including duplicates', async() => {
    const file = join(dir, 'dataset.nt');
    writeFileSync(file, [
      '# A comment',
      '<ex:s> <ex:p> <ex:o> .',
      '',
      '   ',
      '<ex:s> <ex:p> <ex:o> .',
      '  # An indented comment',
      '<ex:s> <ex:p> "o" .',
    ].join('\r\n'));
    await expect(countTriples(file)).resolves.toBe(3);
  });

  it('counts a last line without newline', async() => {
    const file = join(dir, 'dataset.nt');
    writeFileSync(file, '<ex:s> <ex:p> <ex:o1> .\n<ex:s> <ex:p> <ex:o2> .');
    await expect(countTriples(file)).resolves.toBe(2);
  });

  it('rejects on a missing file', async() => {
    await expect(countTriples(join(dir, 'missing.nt'))).rejects.toThrow('ENOENT');
  });
});

describe('getThroughput', () => {
  it('determines the rounded number of triples per second', () => {
    expect(getThroughput(1_000_000, 4_000)).toBe(250_000);
    expect(getThroughput(10, 3_000)).toBe(3);
  });

  it('is undefined for non-positive times', () => {
    expect(getThroughput(10, 0)).toBeUndefined();
    expect(getThroughput(10, -1)).toBeUndefined();
  });
});

describe('getBytesPerTriple', () => {
  it('determines the rounded number of bytes per triple', () => {
    expect(getBytesPerTriple(1_048_576, 100)).toBe(100);
    expect(getBytesPerTriple(3, 1)).toBe(349_525);
  });

  it('is undefined without triples', () => {
    expect(getBytesPerTriple(0, 100)).toBeUndefined();
  });
});

describe('getTriples', () => {
  it('reads the number of triples from the extra field', () => {
    expect(getTriples({ name: 'S - ingestion time', unit: 'ms', value: 1, extra: 'Triples: 123; Runs: [1]' }))
      .toBe(123);
  });

  it('is undefined if the extra field has no number of triples', () => {
    expect(getTriples({ name: 'S - ingestion time', unit: 'ms', value: 1, extra: 'Runs: [1]' })).toBeUndefined();
    expect(getTriples({ name: 'S - ingestion time', unit: 'ms', value: 1 })).toBeUndefined();
  });
});

describe('toIngestionEntries', () => {
  it('reports the median of each metric, with the number of triples and derived metrics', () => {
    expect(toIngestionEntries('S', 1_048_576, [
      { ingestionTime: 1000.4, rss: 800.4 * MIB, heapUsed: 80 * MIB, external: 120 * MIB, storeSize: 400.4 * MIB },
      { ingestionTime: 900.6, rss: 790 * MIB, heapUsed: 79 * MIB, external: 121 * MIB, storeSize: 402 * MIB },
      { ingestionTime: 1100, rss: 810 * MIB, heapUsed: 81 * MIB, external: 119 * MIB, storeSize: 398 * MIB },
    ])).toEqual([
      {
        name: 'S - ingestion time',
        unit: 'ms',
        value: 1000,
        extra: 'Triples: 1048576; Throughput: 1048576 triples/s; Runs: [1000,901,1100]',
      },
      {
        name: 'S - memory after ingestion',
        unit: 'MiB',
        value: 800,
        extra: 'Triples: 1048576; Per triple: 800 bytes; Runs: [800,790,810]; ' +
          'Heap used: [80,79,81]; External: [120,121,119]',
      },
      {
        name: 'S - store size after ingestion',
        unit: 'MiB',
        value: 400,
        extra: 'Triples: 1048576; Per triple: 400 bytes; Runs: [400,402,398]',
      },
    ]);
  });

  it('reports unavailable derived metrics', () => {
    const entries = toIngestionEntries('S', 0, [{ ingestionTime: 0, rss: 0, heapUsed: 0, external: 0, storeSize: 0 }]);
    expect(entries[0].extra).toBe('Triples: 0; Throughput: n/a triples/s; Runs: [0]');
    expect(entries[1].extra).toBe('Triples: 0; Per triple: n/a bytes; Runs: [0]; Heap used: [0]; External: [0]');
    expect(entries[2].extra).toBe('Triples: 0; Per triple: n/a bytes; Runs: [0]');
  });
});
