import type { IGhbenchEntry } from './performanceComparison';

/**
 * The measurements of one ingestion run, each in a fresh process.
 */
export interface IIngestionRun {
  /**
   * The time to ingest the dataset in ms, excluding engine startup and query overhead.
   */
  ingestionTime: number;
  /**
   * The resident set size of the process in bytes, after full ingestion and garbage collection.
   */
  rss: number;
  /**
   * The used heap size in bytes, after full ingestion and garbage collection.
   */
  heapUsed: number;
  /**
   * The memory in bytes of C++ objects bound to JavaScript objects, after full ingestion and garbage collection.
   */
  external: number;
}

export const INGESTION_TIME_SUFFIX = ' - ingestion time';
export const INGESTION_MEMORY_SUFFIX = ' - memory after ingestion';

/**
 * Determine the median of the given values.
 * @param values Non-empty values.
 */
export function median(values: number[]): number {
  if (values.length === 0) {
    throw new Error('Cannot determine the median of no values');
  }
  const sorted = [ ...values ].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function toMebibytes(bytes: number): number {
  return Math.round(bytes / 1024 / 1024);
}

/**
 * Convert ingestion runs into entries for the Benchmark Github Action, using the median of each metric.
 * @param label The label of the benchmark suite.
 * @param runs Non-empty ingestion runs.
 */
export function toIngestionEntries(label: string, runs: IIngestionRun[]): IGhbenchEntry[] {
  const times = runs.map(run => Math.round(run.ingestionTime));
  const rss = runs.map(run => toMebibytes(run.rss));
  const heapUsed = runs.map(run => toMebibytes(run.heapUsed));
  const external = runs.map(run => toMebibytes(run.external));
  return [
    {
      name: `${label}${INGESTION_TIME_SUFFIX}`,
      unit: 'ms',
      value: median(times),
      extra: `Runs: [${times.join(',')}]`,
    },
    {
      name: `${label}${INGESTION_MEMORY_SUFFIX}`,
      unit: 'MiB',
      value: median(rss),
      extra: `Runs: [${rss.join(',')}]; Heap used: [${heapUsed.join(',')}]; External: [${external.join(',')}]`,
    },
  ];
}
