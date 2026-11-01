// JS floor: hand-coded evaluation of LDBC SNB short reads directly on rdf-stores, plus SPARQL JSON serialization.
// Shows what plain JavaScript costs for the same lookups that Oxigraph does, without any engine overhead.
// Usage: node perf-harness/js-floor.js <dataset.nt> <queries-dir> <reps>
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const { StreamParser } = require('n3');
const { DataFactory } = require('rdf-data-factory');
const { RdfStore } = require('rdf-stores');

const [ dataset, queriesDir, repsArg ] = process.argv.slice(2);
const reps = Number(repsArg);
const DF = new DataFactory();
const SN = 'http://www.ldbc.eu/ldbc_socialnet/1.0/data/';
const V = 'http://www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/';
const RDF_TYPE = DF.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
const p = name => DF.namedNode(V + name);

function termToJson(term) {
  if (term.termType === 'NamedNode') {
    return { type: 'uri', value: term.value };
  }
  if (term.termType === 'BlankNode') {
    return { type: 'bnode', value: term.value };
  }
  return term.language ?
      { type: 'literal', value: term.value, 'xml:lang': term.language } :
      { type: 'literal', value: term.value, datatype: term.datatype.value };
}

function serialize(vars, rows) {
  return JSON.stringify({
    head: { vars },
    results: { bindings: rows.map(row => Object.fromEntries(Object.entries(row).map(([ k, t ]) => [ k, termToJson(t) ]))) },
  });
}

// Nested-loop over the patterns of a star, binding one object variable per pattern
function star(store, subject, predicates, row, out) {
  if (predicates.length === 0) {
    out.push({ ...row });
    return;
  }
  const [ [ variable, predicate ], ...rest ] = predicates;
  for (const quad of store.readQuads(subject, predicate, null, null)) {
    row[variable] = quad.object;
    star(store, subject, rest, row, out);
  }
  delete row[variable];
}

const queries = {
  'interactive-short-1'(store, id) {
    const s = DF.namedNode(`${SN}${id}`);
    const out = [];
    if (store.countQuads(s, RDF_TYPE, p('Person'), null) === 0) {
      return out;
    }
    const rows = [];
    star(store, s, [[ 'personId', p('id') ], [ 'firstName', p('firstName') ], [ 'lastName', p('lastName') ],
      [ 'gender', p('gender') ], [ 'birthday', p('birthday') ], [ 'creationDate', p('creationDate') ],
      [ 'locationIP', p('locationIP') ], [ 'city', p('isLocatedIn') ], [ 'browserUsed', p('browserUsed') ]], {}, rows);
    for (const row of rows) {
      for (const quad of store.readQuads(row.city, p('id'), null, null)) {
        const { personId, city, ...rest } = row;
        out.push({ ...rest, cityId: quad.object });
      }
    }
    return out;
  },
  'interactive-short-4'(store, id) {
    const s = DF.namedNode(`${SN}${id}`);
    const rows = [];
    for (const contentPredicate of [ p('content'), p('imageFile') ]) {
      star(store, s, [[ 'messageId', p('id') ], [ 'messageCreationDate', p('creationDate') ],
        [ 'messageContent', contentPredicate ]], {}, rows);
    }
    return rows.map(({ messageCreationDate, messageContent }) => ({ messageCreationDate, messageContent }));
  },
  'interactive-short-5'(store, id) {
    const s = DF.namedNode(`${SN}${id}`);
    const out = [];
    const rows = [];
    star(store, s, [[ 'messageId', p('id') ], [ 'creator', p('hasCreator') ]], {}, rows);
    for (const row of rows) {
      const inner = [];
      star(store, row.creator, [[ 'personId', p('id') ], [ 'firstName', p('firstName') ],
        [ 'lastName', p('lastName') ]], {}, inner);
      out.push(...inner);
    }
    return out;
  },
};

const median = (a) => {
  const s = [ ...a ].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};

(async() => {
  const store = RdfStore.createDefault();
  const start = performance.now();
  await new Promise((resolve, reject) => fs.createReadStream(dataset)
    .pipe(new StreamParser({ format: 'N-Triples' }))
    .on('data', quad => store.addQuad(quad))
    .on('error', reject)
    .on('end', resolve));
  console.error(`loaded ${store.size} quads in ${((performance.now() - start) / 1000).toFixed(1)}s`);

  const instances = [];
  for (const name of Object.keys(queries)) {
    const text = fs.readFileSync(path.join(queriesDir, `${name}.sparql`), 'utf8');
    for (const [ i, query ] of text.split(/\n\s*\n/u).filter(q => q.trim()).entries()) {
      instances.push({ name: `${name}#${i}`, run: queries[name], id: /sn:((?:pers|comm|post)\d+)/u.exec(query)[1] });
    }
  }
  for (let i = 0; i < 200; i++) {
    for (const { run, id } of instances) {
      serialize([ 'x' ], run(store, id));
    }
  }
  console.log('query\tresults\tevaluate_ms\tevaluate_serialize_ms');
  for (const { name, run, id } of instances) {
    const evalTimes = [];
    const fullTimes = [];
    let n;
    for (let i = 0; i < reps; i++) {
      let t = performance.now();
      n = run(store, id).length;
      evalTimes.push(performance.now() - t);
      t = performance.now();
      const rows = run(store, id);
      serialize(Object.keys(rows[0] ?? {}), rows);
      fullTimes.push(performance.now() - t);
    }
    console.log(`${name}\t${n}\t${median(evalTimes).toFixed(4)}\t${median(fullTimes).toFixed(4)}`);
  }
})();
