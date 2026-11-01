// Count calls on the code paths the prototypes should remove, with and without the flags.
const fs = require('node:fs');
const path = require('node:path');
const [ engineDir, dataset, ...files ] = process.argv.slice(2);
const P = '/home/user/comunica/packages';
const counts = {};
const count = (obj, method, label) => {
  const orig = obj[method];
  obj[method] = function(...args) {
    counts[label] = (counts[label] ?? 0) + 1;
    return orig.apply(this, args);
  };
};
count(require(`${P}/actor-optimize-query-operation-query-source-skolemize/lib/QuerySourceSkolemized.js`).QuerySourceSkolemized.prototype, 'queryBindings', 'skolemized.queryBindings');
count(require(`${P}/actor-query-source-identify-hypermedia/lib/QuerySourceHypermedia.js`).QuerySourceHypermedia.prototype, 'queryBindings', 'hypermedia.queryBindings');
const traqula = require(require.resolve('@traqula/core', { paths: [ `${P}/utils-algebra` ] }));
count(traqula.TransformerObject.prototype, 'cloneObj', 'traqula.cloneObj');
const { ActorRdfJoin } = require(`${P}/bus-rdf-join/lib/ActorRdfJoin.js`);
count(ActorRdfJoin.prototype, 'test', 'rdfJoin.test');
count(require(`${P}/core/lib/Actor.js`).Actor, 'getContextLogger', 'getContextLogger');
const { QueryEngine } = require(path.resolve(engineDir));
const engine = new QueryEngine();
const context = { sources: [ path.resolve(dataset) ] };
const queries = files.flatMap(f => fs.readFileSync(f, 'utf8').split(/\n\s*\n/u).map(q => q.trim()).filter(Boolean));
(async() => {
  await engine.queryBoolean('ASK { ?s ?p ?o }', context);
  for (const flags of [ {}, { joinPlan: true, noSkolem: true, unwrap: true, cow: true, joinConnectedFast: true } ]) {
    globalThis.__proto = flags;
    for (const q of queries) {
      await (await engine.queryBindings(q, context)).toArray();
    }
    for (const k of Object.keys(counts)) {
      counts[k] = 0;
    }
    for (const q of queries) {
      await (await engine.queryBindings(q, context)).toArray();
    }
    console.log(JSON.stringify(flags), JSON.stringify(Object.fromEntries(Object.entries(counts).map(([ k, v ]) => [ k, +(v / queries.length).toFixed(1) ]))));
  }
  process.exit(0);
})();
