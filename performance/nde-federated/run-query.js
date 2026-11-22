// Runs one SPARQL query over a set of SPARQL endpoints with Comunica, recording HTTP metrics.
// Usage: node run-query.js <query.rq> <sources.txt> <out-prefix> [timeoutSec] [configPath]
const fs = require('node:fs');
const path = require('node:path');
const { fetch: undiciFetch, EnvHttpProxyAgent, Agent } = require('undici');

const [queryFile, sourcesFile, outPrefix, timeoutArg, configPath] = process.argv.slice(2);
const timeoutMs = (Number(timeoutArg) || 600) * 1000;
const query = fs.readFileSync(queryFile, 'utf8');
const sources = fs.readFileSync(sourcesFile, 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));

// Raw (wire) byte counting per origin+path, below decompression.
const wire = new Map();
function wireRec(key) {
  if (!wire.has(key)) wire.set(key, { requests: 0, bytes: 0 });
  return wire.get(key);
}
const countingInterceptor = dispatch => (opts, handler) => {
  const key = `${opts.origin}${String(opts.path).split('?')[0]}`;
  const rec = wireRec(key);
  rec.requests++;
  const wrapped = new Proxy(handler, {
    get(target, prop) {
      if (prop === 'onResponseData') {
        return (controller, chunk) => { rec.bytes += chunk.length; return target.onResponseData(controller, chunk); };
      }
      if (prop === 'onData') {
        return chunk => { rec.bytes += chunk.length; return target.onData(chunk); };
      }
      const v = Reflect.get(target, prop, target);
      return typeof v === 'function' ? v.bind(target) : v;
    },
  });
  return dispatch(opts, wrapped);
};
const baseAgent = process.env.HTTPS_PROXY ? new EnvHttpProxyAgent() : new Agent();
const dispatcher = baseAgent.compose(countingInterceptor);

function classify(q) {
  if (!q) return 'no-query';
  const body = q.replace(/^\s*(PREFIX\s+[^\s]*\s*<[^>]*>\s*|BASE\s*<[^>]*>\s*)*/gi, '').trimStart();
  if (/^ASK/i.test(body)) return 'ask';
  if (/^SELECT/i.test(body) && /EXISTS\s*\{/i.test(body) && /^SELECT\s*\(\s*EXISTS/i.test(body)) return 'ask-batch';
  if (/^SELECT\s*\(\s*COUNT\s*\(/i.test(body)) return 'count';
  if (/^SELECT/i.test(body)) return 'select';
  if (/^CONSTRUCT/i.test(body)) return 'construct';
  return 'other';
}

const requests = [];
const t0 = performance.now();
async function countingFetch(input, init = {}) {
  const url = typeof input === 'string' ? input : (input.url ?? String(input));
  const method = (init.method || 'GET').toUpperCase();
  let q;
  try {
    const u = new URL(url);
    q = u.searchParams.get('query') ?? undefined;
    if (!q && init.body) {
      const b = typeof init.body === 'string' ? init.body : (init.body instanceof URLSearchParams ? init.body.toString() : undefined);
      if (b) q = new URLSearchParams(b).get('query') ?? undefined;
    }
  } catch {}
  const endpoint = url.split('?')[0];
  const rec = { url: url.length > 300 ? url.slice(0, 300) : url, reqHeaders: process.env.DEBUG_HEADERS ? JSON.stringify(init.headers instanceof Headers ? Object.fromEntries(init.headers) : init.headers) : undefined, endpoint, method, kind: classify(q), start: Math.round(performance.now() - t0), query: q?.slice(0, 4000), queryLength: q?.length ?? 0 };
  requests.push(rec);
  let res;
  try {
    if (!q && method === 'GET' && process.env.FOLLOW_SD_REDIRECTS !== '1') {
      // Workaround: do not follow redirects of service-description GETs (no query parameter),
      // as Comunica would otherwise adopt the redirect target as SPARQL endpoint URL.
      res = await undiciFetch(input, { ...init, dispatcher, redirect: 'manual' });
      const loc = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && loc) {
        const target = new URL(loc, url);
        rec.sdRedirectBlocked = target.href;
      }
    } else {
      res = await undiciFetch(input, { ...init, dispatcher });
    }
  } catch (e) {
    rec.error = String(e?.cause?.message ?? e.message);
    rec.end = Math.round(performance.now() - t0);
    throw e;
  }
  rec.status = res.status;
  rec.contentType = res.headers.get('content-type');
  rec.decodedBytes = 0;
  if (!res.body) { rec.end = Math.round(performance.now() - t0); return res; }
  const chunks = [];
  let keep = true;
  const ts = new TransformStream({
    transform(chunk, controller) {
      rec.decodedBytes += chunk.byteLength;
      if (keep && rec.decodedBytes < 20e6) chunks.push(Buffer.from(chunk)); else keep = false;
      controller.enqueue(chunk);
    },
    flush() {
      rec.end = Math.round(performance.now() - t0);
      if (keep) {
        const text = Buffer.concat(chunks).toString('utf8');
        try {
          if (/json/.test(rec.contentType ?? '')) {
            const j = JSON.parse(text);
            if ('boolean' in j) rec.boolean = j.boolean;
            else if (j.results) rec.rows = j.results.bindings.length;
            if (rec.kind === 'count' && j.results?.bindings?.[0]) rec.countValue = Number(Object.values(j.results.bindings[0])[0]?.value);
            if (rec.kind === 'ask-batch' && j.results?.bindings?.[0]) {
              const vals = Object.values(j.results.bindings[0]).map(v => v.value);
              rec.askTrue = vals.filter(v => v === 'true' || v === '1').length; rec.askTotal = vals.length;
            }
          } else if (/xml/.test(rec.contentType ?? '')) {
            const m = text.match(/<result>/g); rec.rows = m ? m.length : 0;
            const b = text.match(/<boolean>\s*(true|false)/); if (b) rec.boolean = b[1] === 'true';
          }
          if (rec.status >= 400) rec.errorBody = text.slice(0, 300);
          if (rec.kind === 'no-query') { rec.bodyHead = text.slice(0, 1500); rec.finalUrl = res.url; }
        } catch (e) { rec.parseError = String(e.message).slice(0, 100); }
      }
    },
  });
  const body = res.body.pipeThrough(ts);
  const out = new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
  Object.defineProperty(out, 'url', { value: res.url });
  Object.defineProperty(out, 'redirected', { value: res.redirected });
  return out;
}

async function main() {
  let engine;
  if (configPath) {
    const { QueryEngineFactory } = require('../../engines/query-sparql/lib/index.js');
    engine = await new QueryEngineFactory().create({ configPath: path.resolve(configPath) });
  } else {
    const { QueryEngine } = require('../../engines/query-sparql/lib/index.js');
    engine = new QueryEngine();
  }
  const context = {
    sources: sources.map(value => ({ type: 'sparql', value })),
    fetch: countingFetch,
    log: new (require('@comunica/logger-pretty').LoggerPretty)({ level: process.env.LOG_LEVEL || 'warn' }),
  };
  if (process.env.RETRY) {
    // Opt-in retries for rate-limited public endpoints (429/503), off by default in Comunica.
    context.httpRetryCount = Number(process.env.RETRY);
    context.httpRetryDelayFallback = 1000;
    context.httpRetryDelayLimit = 30000;
    context.httpRetryStatusCodes = [429, 503];
  }
  const results = [];
  let firstResult;
  let error;
  const timer = setTimeout(() => { finish('timeout'); }, timeoutMs);
  let finished = false;
  function finish(status) {
    if (finished) return; finished = true;
    clearTimeout(timer);
    const total = performance.now() - t0;
    const byKind = {}; const byEndpoint = {};
    for (const r of requests) {
      byKind[r.kind] = (byKind[r.kind] || 0) + 1;
      const e = byEndpoint[r.endpoint] ??= { requests: 0, decodedBytes: 0, kinds: {}, dataRows: 0, askTrue: 0, askFalse: 0, errors: 0 };
      e.requests++; e.decodedBytes += r.decodedBytes || 0; e.kinds[r.kind] = (e.kinds[r.kind] || 0) + 1;
      if (r.kind === 'select' && r.rows) e.dataRows += r.rows;
      if (r.kind === 'ask') { if (r.boolean) e.askTrue++; else e.askFalse++; }
      if (r.kind === 'ask-batch') { e.askTrue += r.askTrue || 0; e.askFalse += (r.askTotal || 0) - (r.askTrue || 0); }
      if (r.error || (r.status && r.status >= 400)) e.errors++;
    }
    let wireBytes = 0; let wireRequests = 0;
    for (const v of wire.values()) { wireBytes += v.bytes; wireRequests += v.requests; }
    const summary = {
      status, error: error && String(error.message ?? error).slice(0, 2000),
      results: results.length, timeMs: Math.round(total), firstResultMs: firstResult && Math.round(firstResult),
      httpRequests: requests.length, httpRequestsWire: wireRequests, byKind,
      decodedBytes: requests.reduce((a, r) => a + (r.decodedBytes || 0), 0), wireBytes,
      sourcesGiven: sources.length,
      sourcesContacted: Object.keys(byEndpoint).length,
      sourcesWithData: Object.entries(byEndpoint).filter(([, e]) => e.dataRows > 0).map(([k]) => k),
      byEndpoint,
    };
    fs.writeFileSync(`${outPrefix}.summary.json`, JSON.stringify(summary, null, 1));
    fs.writeFileSync(`${outPrefix}.requests.json`, JSON.stringify(requests, null, 1));
    fs.writeFileSync(`${outPrefix}.results.json`, JSON.stringify(results, null, 1));
    const { byEndpoint: _, ...short } = summary;
    console.log(JSON.stringify(short));
    process.exit(0);
  }
  try {
    const stream = await engine.queryBindings(query, context);
    stream.on('data', b => {
      if (!firstResult) firstResult = performance.now() - t0;
      const o = {};
      for (const [k, v] of b) o[k.value] = v.termType === 'Literal' ? v.value : v.value;
      results.push(o);
    });
    stream.on('error', e => { error = e; finish('error'); });
    stream.on('end', () => finish('ok'));
  } catch (e) { error = e; finish('error'); }
}
main();
