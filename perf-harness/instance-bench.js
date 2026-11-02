// Per-query comparison of endpoints with the benchmark runner's client, in alternating blocks of back-to-back requests.
// Usage: node perf-harness/instance-bench.js <rounds> <block> <queries.json> <name=endpoint>...
// queries.json: [{ "name": ..., "query": ... }]
const fs = require('node:fs');
const { performance } = require('node:perf_hooks');
const { SparqlBenchmarkRunner } = require('/home/user/sparql-benchmark-runner.js');

const [ roundsArg, blockArg, queriesFile, ...targets ] = process.argv.slice(2);
const queries = JSON.parse(fs.readFileSync(queriesFile, 'utf8'));
const endpoints = targets.map(target => target.split('='));
const runners = new Map(endpoints.map(([ name, endpoint ]) => [ name,
  new SparqlBenchmarkRunner({ endpoint, querySets: {}, replication: 1, warmup: 0, timeout: 300_000 }) ]));
const median = (a) => {
  const s = [ ...a ].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;

(async() => {
  const out = [];
  console.log(`query\t${endpoints.map(([ name ]) => `${name} median/mean`).join('\t')}\tratio(median)`);
  for (const { name, query } of queries) {
    const times = Object.fromEntries(endpoints.map(([ endpoint ]) => [ endpoint, [] ]));
    for (let round = -1; round < Number(roundsArg); round++) {
      for (const [ endpoint ] of round % 2 === 0 ? endpoints : [ ...endpoints ].reverse()) {
        for (let i = 0; i < Number(blockArg); i++) {
          const start = performance.now();
          const result = await runners.get(endpoint).executeQuery('q', '0', query);
          if (result.error) {
            throw result.error;
          }
          if (round >= 0) {
            times[endpoint].push(performance.now() - start);
          }
        }
      }
    }
    const medians = endpoints.map(([ endpoint ]) => median(times[endpoint]));
    out.push({ name, times });
    console.log(`${name}\t${endpoints.map(([ endpoint ], i) => `${medians[i].toFixed(3)}/${mean(times[endpoint]).toFixed(3)}`).join('\t')}\t${(medians[0] / medians[1]).toFixed(2)}`);
  }
  if (process.env.OUT) {
    fs.writeFileSync(process.env.OUT, JSON.stringify(out));
  }
})();
