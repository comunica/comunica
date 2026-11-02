// Preload for the benchmark runner (node -r, with CLIENT_LOG=<file>): logs per query the send, response-headers and end times, availability checks, and client GCs.
const http = require('node:http');
const { performance, PerformanceObserver } = require('node:perf_hooks');
const log = { origin: performance.timeOrigin, requests: [], gcs: [] };
new PerformanceObserver(list => {
  for (const e of list.getEntries()) log.gcs.push({ start: e.startTime, duration: e.duration });
}).observe({ entryTypes: [ 'gc' ] });
const request = http.request;
http.request = function(...args) {
  const entry = { send: performance.now() };
  const req = request.apply(this, args);
  if (req.method === 'POST') {
    log.requests.push(entry);
    req.on('response', res => {
      entry.headers = performance.now();
      res.on('end', () => { entry.end = performance.now(); });
    });
  }
  return req;
};
// Availability checks use the global fetch
const fetchOriginal = globalThis.fetch;
log.checks = [];
globalThis.fetch = async function(...args) {
  const entry = { send: performance.now() };
  log.checks.push(entry);
  const response = await fetchOriginal.apply(this, args);
  entry.end = performance.now();
  return response;
};
process.on('exit', () => require('node:fs').writeFileSync(process.env.CLIENT_LOG, JSON.stringify(log)));
