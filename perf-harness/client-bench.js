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

// The runner before the Node http client change (sparql-benchmark-runner 5.1.0, global fetch)
const { SparqlBenchmarkRunner: SparqlBenchmarkRunnerOld } = require('/home/user/jbr.js/node_modules/sparql-benchmark-runner');
const clients = {
  async runnerOld(endpoint, state) {
    state.runnerOld ??= new SparqlBenchmarkRunnerOld({ endpoint, querySets: {}, replication: 1, warmup: 0, timeout: 300_000 });
    const result = await state.runnerOld.executeQuery('q', '0', query);
    if (result.error) {
      throw result.error;
    }
  },
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
  if (process.env.MEAN) {
    return a.reduce((x, y) => x + y, 0) / a.length;
  }
  const s = [ ...a ].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};

(async() => {
  const endpoints = targets.map(t => t.split('='));
  const states = new Map(endpoints.map(([ name ]) => [ name, {} ]));
  const times = new Map();
  const record = async(client, run, name, endpoint, r) => {
    const start = performance.now();
    await run(endpoint, states.get(name));
    if (r >= 0) {
      const key = `${client}\t${name}`;
      const list = times.get(key) ?? [];
      list.push(performance.now() - start);
      times.set(key, list);
    }
  };
  const selectedClients = Object.entries(clients)
    .filter(([ client ]) => !process.env.CLIENTS || process.env.CLIENTS.split(',').includes(client));
  if (process.env.BLOCK) {
    // Alternate blocks of back-to-back requests per endpoint and client,
    // so that all endpoints are measured over the same time windows
    const block = Number(process.env.BLOCK);
    for (const [ name, endpoint ] of endpoints) {
      for (const [ client, run ] of selectedClients) {
        for (let r = 0; r < 20; r++) {
          await record(client, run, name, endpoint, -1);
        }
      }
    }
    for (let round = 0; round < Math.ceil(Number(repsArg) / block); round++) {
      for (const [ name, endpoint ] of endpoints) {
        for (const [ client, run ] of selectedClients) {
          for (let r = 0; r < block; r++) {
            await record(client, run, name, endpoint, r);
          }
        }
      }
    }
  } else if (process.env.SEQUENTIAL) {
    // Back-to-back requests to one endpoint with one client at a time, like a benchmark runner
    for (const [ name, endpoint ] of endpoints) {
      for (const [ client, run ] of Object.entries(clients)
        .filter(([ client ]) => !process.env.CLIENTS || process.env.CLIENTS.split(',').includes(client))) {
        for (let r = -20; r < Number(repsArg); r++) {
          await record(client, run, name, endpoint, r);
        }
      }
    }
  } else {
    for (let r = -20; r < Number(repsArg); r++) {
      for (const [ client, run ] of Object.entries(clients)) {
        for (const [ name, endpoint ] of endpoints) {
          await record(client, run, name, endpoint, r);
        }
      }
    }
  }
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  console.log(`client\t${endpoints.map(([ name ]) => `${name}(median/mean)`).join('\t')}`);
  for (const client of (process.env.CLIENTS?.split(',') ?? Object.keys(clients))) {
    console.log(`${client}\t${endpoints.map(([ name ]) => {
      const list = times.get(`${client}\t${name}`);
      return `${median(list).toFixed(3)}/${mean(list).toFixed(3)}`;
    }).join('\t')}`);
  }
})();
