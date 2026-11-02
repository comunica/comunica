// Run the SPARQL endpoint worker in this process (no cluster master), optionally profiling a window of requests.
// Usage: node perf-harness/inproc-server.js <engine-dir> <dataset> <port>
// Env: DEFAULT_PROTO='{"x":true}' prototype flags (via endpoint-instrument.js),
//      PROFILE=<file> PROFILE_FROM=<n> PROFILE_COUNT=<n> profile requests n..n+count.
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const [ engineDir, dataset, port ] = process.argv.slice(2);
globalThis.__proto = JSON.parse(process.env.DEFAULT_PROTO ?? '{}');
const { QueryEngine } = require(path.resolve(engineDir));
// NON_ORDERED=1 loads files into the default (hash-based) store instead of the ordered store
if (process.env.NON_ORDERED) {
  const { ActorQuerySourceIdentifyHypermediaNone } = require(path.resolve(__dirname, '../packages/actor-query-source-identify-hypermedia-none/lib/ActorQuerySourceIdentifyHypermediaNone.js'));
  const run = ActorQuerySourceIdentifyHypermediaNone.prototype.run;
  ActorQuerySourceIdentifyHypermediaNone.prototype.run = function(...args) {
    this.nonOrderedStore = true;
    return run.apply(this, args);
  };
}
const { HttpServiceSparqlEndpoint } = require(path.resolve(__dirname, '../packages/actor-init-query/lib/HttpServiceSparqlEndpoint.js'));
const { LoggerPretty } = require(path.resolve(__dirname, '../packages/logger-pretty'));

// FACTORY=1 instantiates the engine from its config at runtime, like the endpoint's cluster workers
const factoryArgs = process.env.FACTORY ? {
  moduleRootPath: `${path.resolve(engineDir)}/`,
  mainModulePath: `${path.resolve(engineDir)}/`,
  defaultConfigPath: `${path.resolve(engineDir)}/config/config-default.json`,
} : { engine: new QueryEngine() };
const endpoint = new HttpServiceSparqlEndpoint({
  ...factoryArgs,
  context: { sources: [ path.resolve(dataset) ], log: new LoggerPretty({ level: 'info' }), readOnly: true },
  port: Number(port),
  timeout: 300_000,
});

let requests = 0;
let session;
const from = Number(process.env.PROFILE_FROM ?? 0);
const count = Number(process.env.PROFILE_COUNT ?? 0);
const handleRequest = endpoint.handleRequest;
endpoint.handleRequest = async function(...args) {
  const index = requests++;
  // HEAP_PROFILE=<file> samples allocations that are still live at the end of the window
  if (process.env.HEAP_PROFILE && index === from) {
    const inspector = require('node:inspector/promises');
    session = new inspector.Session();
    session.connect();
    await session.post('HeapProfiler.enable');
    await session.post('HeapProfiler.startSampling', { samplingInterval: 1024 });
  }
  if (process.env.HEAP_PROFILE && session && index === from + count) {
    const { profile } = await session.post('HeapProfiler.getSamplingProfile');
    require('node:fs').writeFileSync(process.env.HEAP_PROFILE, JSON.stringify(profile));
    await session.post('HeapProfiler.stopSampling');
    process.stderr.write('HEAP_PROFILE written\n');
    session.disconnect();
    session = undefined;
  }
  if (process.env.PROFILE && index === from) {
    const inspector = require('node:inspector/promises');
    session = new inspector.Session();
    session.connect();
    await session.post('Profiler.enable');
    await session.post('Profiler.setSamplingInterval', { interval: 50 });
    await session.post('Profiler.start');
    globalThis.__profileStart = performance.now();
  }
  if (session && index === from + count) {
    const { profile } = await session.post('Profiler.stop');
    require('node:fs').writeFileSync(process.env.PROFILE, JSON.stringify(profile));
    process.stderr.write(`PROFILE written: ${count} requests in ${(performance.now() - globalThis.__profileStart).toFixed(0)} ms\n`);
    session.disconnect();
    session = undefined;
  }
  // MEM_EVERY=n prints the heap after full GCs every n requests (needs --expose-gc)
  if (process.env.MEM_EVERY && index % Number(process.env.MEM_EVERY) === 0) {
    globalThis.gc();
    process.stderr.write(`MEM requests ${index} heapUsed ${(process.memoryUsage().heapUsed / 1e6).toFixed(1)} MB\n`);
  }
  return handleRequest.apply(this, args);
};

const devNull = new (require('node:stream').Writable)({ write(chunk, encoding, callback) {
  callback();
} });
endpoint.runWorker(devNull, process.stderr).catch(error => process.stderr.write(`${error.stack}\n`));
