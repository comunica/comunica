// Preload module (node -r) that records per-request stage timings inside the Comunica SPARQL endpoint worker.
// Prints medians of each stage to stderr every REPORT_EVERY requests.
const { performance } = require('node:perf_hooks');
const path = require('node:path');

const packages = path.resolve(__dirname, '../packages');
const { HttpServiceSparqlEndpoint } = require(`${packages}/actor-init-query/lib/HttpServiceSparqlEndpoint.js`);
const { QueryEngineBase } = require(`${packages}/actor-init-query/lib/QueryEngineBase.js`);
const REPORT_EVERY = Number(process.env.REPORT_EVERY ?? 200);

let current;
const samples = [];

const handleRequest = HttpServiceSparqlEndpoint.prototype.handleRequest;
HttpServiceSparqlEndpoint.prototype.handleRequest = function(engine, variants, stdout, stderr, request, response) {
  const marks = { start: performance.now() };
  current = marks;
  response.on('finish', () => {
    marks.finish = performance.now();
    if (marks.queryStart === undefined) {
      return;
    }
    samples.push(marks);
    if (samples.length % REPORT_EVERY === 0) {
      report();
    }
  });
  return handleRequest.call(this, engine, variants, stdout, stderr, request, response);
};

const writeQueryResult = HttpServiceSparqlEndpoint.prototype.writeQueryResult;
HttpServiceSparqlEndpoint.prototype.writeQueryResult = function(...args) {
  current.writeQueryResult = performance.now();
  return writeQueryResult.apply(this, args);
};

const query = QueryEngineBase.prototype.query;
QueryEngineBase.prototype.query = async function(...args) {
  const marks = current;
  marks.queryStart = performance.now();
  try {
    return await query.apply(this, args);
  } finally {
    marks.queryEnd = performance.now();
  }
};

const resultToString = QueryEngineBase.prototype.resultToString;
QueryEngineBase.prototype.resultToString = async function(...args) {
  const marks = current;
  marks.serializeStart = performance.now();
  try {
    return await resultToString.apply(this, args);
  } finally {
    marks.serializeSetupEnd = performance.now();
  }
};

function median(values) {
  const sorted = [ ...values ].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function report() {
  const recent = samples.slice(-REPORT_EVERY);
  const stage = (from, to) => median(recent.map(m => m[to] - m[from])).toFixed(3);
  process.stderr.write(`ENDPOINT-STAGES n=${recent.length} ` +
    `negotiate+route ${stage('start', 'writeQueryResult')} ` +
    `pre-query ${stage('writeQueryResult', 'queryStart')} ` +
    `engine.query ${stage('queryStart', 'queryEnd')} ` +
    `between ${stage('queryEnd', 'serializeStart')} ` +
    `resultToString ${stage('serializeStart', 'serializeSetupEnd')} ` +
    `stream+write ${stage('serializeSetupEnd', 'finish')} ` +
    `total ${stage('start', 'finish')}\n`);
}
