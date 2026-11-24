#!/usr/bin/env node

// eslint-disable-next-line import/no-nodejs-modules
import { spawnSync } from 'node:child_process';

// eslint-disable-next-line import/no-nodejs-modules
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';

// eslint-disable-next-line import/no-nodejs-modules
import { tmpdir } from 'node:os';

// eslint-disable-next-line import/no-nodejs-modules
import { dirname, join, resolve } from 'node:path';

import type { IIngestionRun } from '../lib/performanceIngestion';
import { countTriples, toIngestionEntries } from '../lib/performanceIngestion';

// Usage: performance-ingestion <engine dir> <dataset> <label> <output file> [runs]
// Measures how long a file-based engine takes to ingest a line-based RDF dataset (such as N-Triples),
// its total memory usage afterwards, and the size of what ingestion keeps alive, which is mainly the in-memory store.
// Each run uses a fresh process, which inherits the Node.js options of this one (such as --max-old-space-size).

interface IQueryEngine {
  queryBoolean: (query: string, context: Record<string, unknown>) => Promise<boolean>;
}

const MEASURE_FLAG = '--measure';

// By default, glibc keeps a varying amount of freed memory, depending on thread and allocation timing,
// which makes the RSS after ingestion vary by about 6% across runs.
// Fixing its thresholds and limiting its arenas makes it vary by less than 1%.
const MALLOC_OPTIONS = {
  MALLOC_ARENA_MAX: '2',
  MALLOC_MMAP_THRESHOLD_: '131072',
  MALLOC_TRIM_THRESHOLD_: '131072',
};

/**
 * Execute an ASK query over a file, which requires the file to be fully ingested.
 * @param engine A query engine.
 * @param file The path of an RDF file.
 * @return The duration in ms.
 */
async function ask(engine: IQueryEngine, file: string): Promise<number> {
  const start = performance.now();
  const result = await engine.queryBoolean('ASK { ?s ?p ?o }', { sources: [{ type: 'file', value: file }]});
  const duration = performance.now() - start;
  if (!result) {
    throw new Error(`No triples were found in ${file}`);
  }
  return duration;
}

/**
 * Collect garbage and determine the memory usage afterwards.
 * Collect twice with a pause in between, as V8 releases array buffer memory asynchronously.
 * @param gc The garbage collector.
 */
async function settleMemory(gc: () => void): Promise<NodeJS.MemoryUsage> {
  gc();
  await new Promise(resolvePromise => setTimeout(resolvePromise, 500));
  gc();
  return process.memoryUsage();
}

/**
 * Measure a single ingestion run in the current process.
 * @param engineDir The directory of the engine package.
 * @param dataset The path of the dataset.
 */
async function measure(engineDir: string, dataset: string): Promise<IIngestionRun> {
  const gc = (<{ gc?: () => void }> globalThis).gc;
  if (!gc) {
    throw new Error('Measuring ingestion requires the --expose-gc option');
  }
  // eslint-disable-next-line ts/no-var-requires, ts/no-require-imports
  const { QueryEngine }: { QueryEngine: new() => IQueryEngine } = require(engineDir);
  const engine = new QueryEngine();

  // Exclude engine startup and first-query overhead by warming up on a tiny file in the same format
  const warmupDir = mkdtempSync(join(tmpdir(), 'comunica-ingestion-'));
  try {
    const warmupFile = join(warmupDir, 'warmup.nt');
    writeFileSync(warmupFile, '<http://example.org/s> <http://example.org/p> "o" .\n');
    await ask(engine, warmupFile);
    await ask(engine, warmupFile);
  } finally {
    rmSync(warmupDir, { recursive: true, force: true });
  }
  const before = await settleMemory(gc);

  // The first query ingests the dataset, and the second one only measures query overhead by reusing the cached source
  const cold = await ask(engine, dataset);
  // The cached source keeps the ingested dataset in memory
  const { rss, heapUsed, external } = await settleMemory(gc);
  const cached = await ask(engine, dataset);
  return {
    ingestionTime: cold - cached,
    rss,
    heapUsed,
    external,
    storeSize: heapUsed + external - before.heapUsed - before.external,
  };
}

async function run(args: string[]): Promise<void> {
  const [ engineDir, dataset, label, outputFile, runsArg = '5' ] = args;
  const runCount = Number(runsArg);
  if (!engineDir || !dataset || !label || !outputFile || !Number.isInteger(runCount) || runCount < 1) {
    throw new Error('Usage: performance-ingestion <engine dir> <dataset> <label> <output file> [runs]');
  }

  // Counting reads the dataset once, so that the OS file cache is also equally warm for all runs
  const triples = await countTriples(dataset);
  process.stderr.write(`Counted ${triples} triples\n`);

  const runs: IIngestionRun[] = [];
  for (let i = 1; i <= runCount; i++) {
    const child = spawnSync(
      process.execPath,
      [ ...process.execArgv, '--expose-gc', __filename, MEASURE_FLAG, resolve(engineDir), resolve(dataset) ],
      {
        stdio: [ 'ignore', 'pipe', 'inherit' ],
        encoding: 'utf8',
        env: { ...MALLOC_OPTIONS, ...process.env },
      },
    );
    if (child.status !== 0) {
      throw new Error(`Ingestion run ${i} failed with ${child.error?.message ?? child.signal ?? child.status}`);
    }
    const measured: IIngestionRun = JSON.parse(child.stdout.trim().split('\n').pop()!);
    process.stderr.write(`Run ${i}: ingested in ${Math.round(measured.ingestionTime)} ms, using ${Math.round(measured.rss / 1024 / 1024)} MiB, of which the store takes ${Math.round(measured.storeSize / 1024 / 1024)} MiB\n`);
    runs.push(measured);
  }

  const output = JSON.stringify(toIngestionEntries(label, triples, runs), null, '  ');
  mkdirSync(dirname(outputFile), { recursive: true });
  writeFileSync(outputFile, output, 'utf8');
  process.stdout.write(`${output}\n`);
}

function fail(error: Error): void {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}

if (process.argv[2] === MEASURE_FLAG) {
  measure(process.argv[3], process.argv[4])
    .then(measured => process.stdout.write(`${JSON.stringify(measured)}\n`), fail);
} else {
  run(process.argv.slice(2)).then(undefined, fail);
}
