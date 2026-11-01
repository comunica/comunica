// Compare HTTP client approaches against SPARQL endpoints: time per request until the results are parsed.
// Usage: node perf-harness/client-bench.js <reps> <query-file> <name=endpoint>...
const fs = require('node:fs');
const http = require('node:http');
const { performance } = require('node:perf_hooks');
const { SparqlBenchmarkRunner } = require('/home/user/sparql-benchmark-runner.js');
const undici = require('/home/user/jbr.js/node_modules/undici');

const [ repsArg, queryFile, ...targets ] = process.argv.slice(2);
const query = fs.readFileSync(queryFile, 'utf8').split(/\n\s*\n/u)[0].trim();
const accept = 'application/sparql-results+json';
const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });

const clients = {
  async runner(endpoint, state) {
    state.runner ??= new SparqlBenchmarkRunner({ endpoint, querySets: {}, replication: 1, warmup: 0, timeout: 300_000 });
    const result = await state.runner.executeQuery('q', '0', query);
    if (result.error) {
      throw result.error;
    }
  },
  async fetch(endpoint) {
    const response = await fetch(`${endpoint}?query=${encodeURIComponent(query)}`, { headers: { accept } });
    JSON.parse(await response.text());
  },
  async undici(endpoint) {
    const { body } = await undici.request(`${endpoint}?query=${encodeURIComponent(query)}`, { headers: { accept } });
    JSON.parse(await body.text());
  },
  http(endpoint) {
    return new Promise((resolve, reject) => {
      http.get(`${endpoint}?query=${encodeURIComponent(query)}`, { agent, headers: { accept } }, (response) => {
        let data = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          data += chunk;
        });
        response.on('end', () => {
          JSON.parse(data);
          resolve();
        });
        response.on('error', reject);
      }).on('error', reject);
    });
  },
};

const median = (a) => {
  const s = [ ...a ].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};

(async() => {
  const endpoints = targets.map(t => t.split('='));
  const states = new Map(endpoints.map(([ name ]) => [ name, {} ]));
  const times = new Map();
  for (let r = -20; r < Number(repsArg); r++) {
    for (const [ client, run ] of Object.entries(clients)) {
      for (const [ name, endpoint ] of endpoints) {
        const start = performance.now();
        await run(endpoint, states.get(name));
        if (r >= 0) {
          const key = `${client}\t${name}`;
          const list = times.get(key) ?? [];
          list.push(performance.now() - start);
          times.set(key, list);
        }
      }
    }
  }
  console.log(`client\t${endpoints.map(([ name ]) => name).join('\t')}`);
  for (const client of Object.keys(clients)) {
    console.log(`${client}\t${endpoints.map(([ name ]) => median(times.get(`${client}\t${name}`)).toFixed(3)).join('\t')}`);
  }
})();
