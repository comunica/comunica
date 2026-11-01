// Attribute .cpuprofile samples to cost categories, by the innermost frame that belongs to a known category.
const fs = require('node:fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const byId = new Map(p.nodes.map(n => [ n.id, n ]));
const parent = new Map();
for (const n of p.nodes) {
  for (const c of n.children ?? []) {
    parent.set(c, n.id);
  }
}
const rules = [
  [ 'parse (traqula)', /@traqula|actor-query-parse-sparql/u ],
  [ 'join planning', /bus-rdf-join|rdf-join-selectivity|rdf-join-entries-sort|mediator-join-coefficients|actor-rdf-join-/u ],
  [ 'optimize actors', /actor-optimize-query-operation-(?!query-source-skolemize)/u ],
  [ 'store lookup (rdf-stores)', /rdf-stores|rdf-terms|rdf-string/u ],
  [ 'source wrappers', /actor-query-source-identify|query-source-skolemize|actor-query-operation-source|utils-query-operation/u ],
  [ 'bindings', /utils-bindings-factory|immutable|bindings-context|actor-merge-bindings/u ],
  [ 'expressions', /expression-evaluator|function-factory|term-comparator/u ],
  [ 'serialization', /query-result-serialize|readable-stream|jsonld|SparqlJson/u ],
  [ 'other query operations', /actor-query-operation-/u ],
  [ 'iterators', /asynciterator|asyncjoin|utils-iterator/u ],
  [ 'mediation (core, mediators)', /@comunica\/core|packages\/core\/|mediator-/u ],
  [ 'context', /context-entries|actor-context-preprocess|ActionContext/u ],
];
const cat = new Map();
let total = 0;
for (let i = 0; i < p.samples.length; i++) {
  let id = p.samples[i];
  const t = p.timeDeltas[i];
  const leaf = byId.get(id).callFrame;
  if ([ '(idle)', '(program)' ].includes(leaf.functionName) || leaf.url.startsWith('node:inspector')) {
    continue;
  }
  total += t;
  let name = leaf.functionName === '(garbage collector)' ? 'gc' : undefined;
  while (!name && id !== undefined) {
    const url = byId.get(id).callFrame.url;
    for (const [ n, re ] of rules) {
      if (re.test(url)) {
        name = n;
        break;
      }
    }
    id = parent.get(id);
  }
  name ??= 'other (node, microtasks, harness)';
  cat.set(name, (cat.get(name) ?? 0) + t);
}
for (const [ k, v ] of [ ...cat ].sort((a, b) => b[1] - a[1])) {
  console.log(`${(100 * v / total).toFixed(1).padStart(5)}%  ${k}`);
}
