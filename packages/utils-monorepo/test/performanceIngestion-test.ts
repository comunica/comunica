import { median, toIngestionEntries } from '../lib/performanceIngestion';

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

describe('toIngestionEntries', () => {
  it('reports the median of each metric', () => {
    expect(toIngestionEntries('S', [
      { ingestionTime: 1000.4, rss: 800.4 * MIB, heapUsed: 80 * MIB, external: 120 * MIB },
      { ingestionTime: 900.6, rss: 790 * MIB, heapUsed: 79 * MIB, external: 121 * MIB },
      { ingestionTime: 1100, rss: 810 * MIB, heapUsed: 81 * MIB, external: 119 * MIB },
    ])).toEqual([
      {
        name: 'S - ingestion time',
        unit: 'ms',
        value: 1000,
        extra: 'Runs: [1000,901,1100]',
      },
      {
        name: 'S - memory after ingestion',
        unit: 'MiB',
        value: 800,
        extra: 'Runs: [800,790,810]; Heap used: [80,79,81]; External: [120,121,119]',
      },
    ]);
  });
});
