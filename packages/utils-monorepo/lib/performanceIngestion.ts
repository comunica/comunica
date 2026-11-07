// eslint-disable-next-line import/no-nodejs-modules
import { createReadStream } from 'node:fs';

// eslint-disable-next-line import/no-nodejs-modules
import { createInterface } from 'node:readline';

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

/**
 * Count the triples in a line-based RDF file, such as N-Triples, by counting its non-empty non-comment lines.
 * Duplicate triples are counted as well, as they are ingested too.
 * @param path The path of the file.
 */
export async function countTriples(path: string): Promise<number> {
  let triples = 0;
  for await (const line of createInterface({ input: createReadStream(path), crlfDelay: Number.POSITIVE_INFINITY })) {
    const trimmed = line.trim();
    if (trimmed.length > 0 && !trimmed.startsWith('#')) {
      triples++;
    }
  }
  return triples;
}

/**
 * Determine the number of triples ingested per second.
 * @param triples The number of triples.
 * @param milliseconds The ingestion time in ms.
 * @return The rounded throughput, or undefined if the ingestion time is not positive.
 */
export function getThroughput(triples: number, milliseconds: number): number | undefined {
  return milliseconds > 0 ? Math.round(triples * 1000 / milliseconds) : undefined;
}

/**
 * Determine the memory usage per triple.
 * @param triples The number of triples.
 * @param mebibytes The memory usage in MiB.
 * @return The rounded number of bytes per triple, or undefined if there are no triples.
 */
export function getBytesPerTriple(triples: number, mebibytes: number): number | undefined {
  return triples > 0 ? Math.round(mebibytes * 1024 * 1024 / triples) : undefined;
}

/**
 * Determine the number of triples of an entry produced by {@link toIngestionEntries}.
 * @param entry An ingestion entry.
 * @return The number of triples, or undefined if unknown.
 */
export function getTriples(entry: IGhbenchEntry): number | undefined {
  const match = /Triples: (\d+)/u.exec(entry.extra ?? '');
  return match ? Number(match[1]) : undefined;
}

function toMebibytes(bytes: number): number {
  return Math.round(bytes / 1024 / 1024);
}

function formatOptional(value: number | undefined): string {
  return value === undefined ? 'n/a' : String(value);
}

/**
 * Convert ingestion runs into entries for the Benchmark Github Action, using the median of each metric.
 * The number of triples and the metrics derived from it are added to the extra field.
 * @param label The label of the benchmark suite.
 * @param triples The number of triples in the dataset.
 * @param runs Non-empty ingestion runs.
 */
export function toIngestionEntries(label: string, triples: number, runs: IIngestionRun[]): IGhbenchEntry[] {
  const times = runs.map(run => Math.round(run.ingestionTime));
  const rss = runs.map(run => toMebibytes(run.rss));
  const heapUsed = runs.map(run => toMebibytes(run.heapUsed));
  const external = runs.map(run => toMebibytes(run.external));
  const time = median(times);
  const memory = median(rss);
  return [
    {
      name: `${label}${INGESTION_TIME_SUFFIX}`,
      unit: 'ms',
      value: time,
      extra: `Triples: ${triples}; Throughput: ${formatOptional(getThroughput(triples, time))} triples/s; Runs: [${times.join(',')}]`,
    },
    {
      name: `${label}${INGESTION_MEMORY_SUFFIX}`,
      unit: 'MiB',
      value: memory,
      extra: `Triples: ${triples}; Per triple: ${formatOptional(getBytesPerTriple(triples, memory))} bytes; Runs: [${rss.join(',')}]; Heap used: [${heapUsed.join(',')}]; External: [${external.join(',')}]`,
    },
  ];
}
