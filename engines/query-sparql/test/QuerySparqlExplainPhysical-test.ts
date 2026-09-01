import { join } from 'node:path';
import { Parser, Store } from 'n3';
import { QueryEngine } from '../lib/QueryEngine';
import { QueryEngineFactory } from '../lib/QueryEngineFactory';

const DATA = `
@prefix ex: <http://example.org/> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
ex:alice a foaf:Person ; foaf:name "Alice" ; foaf:age 30 ; foaf:knows ex:bob, ex:carol .
ex:bob a foaf:Person ; foaf:name "Bob" ; foaf:age 25 ; foaf:knows ex:carol .
ex:carol a foaf:Person ; foaf:name "Carol" ; foaf:age 35 ; foaf:knows ex:alice .
ex:dave a foaf:Person ; foaf:name "Dave" ; foaf:age 40 .
ex:eve a foaf:Person ; foaf:name "Eve" ; foaf:age 22 ; foaf:knows ex:dave .
`;

const PREFIXES = `PREFIX ex: <http://example.org/> PREFIX foaf: <http://xmlns.com/foaf/0.1/> `;

function createStore(): any {
  const store = new Store();
  store.addQuads(new Parser().parse(DATA));
  return store;
}

/**
 * Replace measured durations, so that plans of separate runs can be compared.
 */
function normalize(plan: string): string {
  return plan.replaceAll(/[\d,.]+ms/gu, 'Xms');
}

/**
 * Additionally replace measured cardinalities.
 * KNOWN ISSUE (plan §2.4): iterator instrumentation is shared between nested operators, so a measured
 * cardinality still varies between runs. Remove this once the measurements are deterministic.
 */
function normalizeCardinalities(plan: string): string {
  return plan.replaceAll(/cardReal:\d+/gu, 'cardReal:X');
}

async function explainPhysical(query: string, context: any = {}): Promise<string> {
  const engine = new QueryEngine();
  const result = await engine.explain(query, { sources: [ createStore() ], ...context }, 'physical');
  return normalize(<string> result.data);
}

async function explainPhysicalJson(query: string, context: any = {}): Promise<any> {
  const engine = new QueryEngine();
  const result = await engine.explain(query, { sources: [ createStore() ], ...context }, 'physical-json');
  return result.data;
}

const SOURCES_ONE = `
sources:
  0: QuerySourceRdfJs(N3Store)(SkolemID:0)`;

/**
 * Regression harness for `explain physical` and `explain physical-json`.
 *
 * These tests pin down the exact physical plan for a corpus of queries, so that any change to the
 * physical query plan logger becomes visible. Several of them currently document *incorrect* output;
 * those are marked with a `KNOWN ISSUE` comment referring to the section of
 * `packages/actor-query-process-explain-physical/REFACTOR-PLAN.md` that covers them.
 */
describe('System test: QuerySparql explain physical', () => {
  describe('for queries over an in-memory source', () => {
    it('explains a single pattern', async() => {
      await expect(explainPhysical(`${PREFIXES}SELECT * WHERE { ?s ?p ?o }`)).resolves.toBe(`project (o,p,s)
  pattern (?s ?p ?o) src:0
${SOURCES_ONE}`);
    });

    it('explains a two-pattern BGP', async() => {
      await expect(explainPhysical(`${PREFIXES}SELECT * WHERE { ?s foaf:name ?n . ?s foaf:age ?a }`)).resolves
        .toBe(`project (a,n,s)
  join
    join-inner(hash-def) cardReal:5 timeSelf:Xms timeLife:Xms
      pattern (?s http://xmlns.com/foaf/0.1/name ?n) cardEst:5 src:0
      pattern (?s http://xmlns.com/foaf/0.1/age ?a) cardEst:5 src:0
${SOURCES_ONE}`);
    });

    it('explains a three-pattern BGP', async() => {
      await expect(explainPhysical(
        `${PREFIXES}SELECT * WHERE { ?s foaf:name ?n . ?s foaf:age ?a . ?s foaf:knows ?f }`,
      )).resolves.toBe(`project (a,f,n,s)
  join
    join-inner(multi-smallest)
      join-inner(hash-def) cardReal:5 timeSelf:Xms timeLife:Xms
        pattern (?s http://xmlns.com/foaf/0.1/knows ?f) cardEst:5 src:0
        join-inner(hash-def) cardEst:13.648 cardReal:5 timeSelf:Xms timeLife:Xms
          pattern (?s http://xmlns.com/foaf/0.1/name ?n) cardEst:5 src:0
          pattern (?s http://xmlns.com/foaf/0.1/age ?a) cardEst:5 src:0
${SOURCES_ONE}`);
    });

    it('explains a filter', async() => {
      await expect(explainPhysical(`${PREFIXES}SELECT * WHERE { ?s foaf:age ?a FILTER(?a > 25) }`)).resolves
        .toBe(`project (a,s)
  filter
    pattern (?s http://xmlns.com/foaf/0.1/age ?a) src:0
${SOURCES_ONE}`);
    });

    // Both inputs of the bind join are nodes of their own: the pattern that drives the binding, and
    // the pattern that is only probed for its metadata before being bound per binding.
    it('explains an optional', async() => {
      await expect(explainPhysical(`${PREFIXES}SELECT * WHERE { ?s foaf:name ?n OPTIONAL { ?s foaf:knows ?f } }`)).resolves
        .toBe(`project (f,n,s)
  leftjoin
    join-optional(bind) bindOperation:(?s http://xmlns.com/foaf/0.1/name ?n) bindCardEst:5 cardReal:6 timeSelf:Xms timeLife:Xms
      pattern (?s http://xmlns.com/foaf/0.1/name ?n) cardEst:5 src:0
      pattern (?s http://xmlns.com/foaf/0.1/knows ?f) cardEst:5 src:0
      pattern (http://example.org/alice http://xmlns.com/foaf/0.1/knows ?f) src:0 compacted-occurrences:5
${SOURCES_ONE}`);
    });

    it('explains a union', async() => {
      await expect(explainPhysical(`${PREFIXES}SELECT * WHERE { { ?s foaf:name ?n } UNION { ?s foaf:age ?a } }`)).resolves
        .toBe(`project (a,n,s)
  union
    pattern (?s http://xmlns.com/foaf/0.1/name ?n) src:0
    pattern (?s http://xmlns.com/foaf/0.1/age ?a) src:0
${SOURCES_ONE}`);
    });

    it('explains a distinct with order and limit', async() => {
      await expect(explainPhysical(`${PREFIXES}SELECT DISTINCT ?n WHERE { ?s foaf:name ?n } ORDER BY ?n LIMIT 3`)).resolves
        .toBe(`slice
  distinct
    project (n)
      orderby
        pattern (?s http://xmlns.com/foaf/0.1/name ?n) src:0
${SOURCES_ONE}`);
    });

    it('explains a group by', async() => {
      await expect(explainPhysical(`${PREFIXES}SELECT (COUNT(?s) AS ?c) WHERE { ?s foaf:name ?n } GROUP BY ?n`)).resolves
        .toBe(`project (c)
  extend
    group
      pattern (?s http://xmlns.com/foaf/0.1/name ?n) src:0
${SOURCES_ONE}`);
    });

    // ALP evaluation re-dispatches the same path operation object, which no longer collides now that
    // plan nodes have their own identity.
    // KNOWN ISSUE (plan §2.5, §2.6): the path algorithm that ran is not identified, and the
    // per-subject evaluations are siblings of the seed operation.
    it('explains a property path', async() => {
      await expect(explainPhysical(`${PREFIXES}SELECT * WHERE { ?s foaf:knows+ ?o }`)).resolves.toBe(`project (o,s)
  path
    distinct
      path
        distinct
          path
            pattern (?s http://xmlns.com/foaf/0.1/knows ?o) src:0
        path
          pattern (http://example.org/alice http://xmlns.com/foaf/0.1/knows ?b) src:0
        path
          pattern (http://example.org/bob http://xmlns.com/foaf/0.1/knows ?b) src:0
        path
          pattern (http://example.org/carol http://xmlns.com/foaf/0.1/knows ?b) src:0
        path
          pattern (http://example.org/dave http://xmlns.com/foaf/0.1/knows ?b) src:0
${SOURCES_ONE}`);
    });

    it('explains a minus', async() => {
      await expect(explainPhysical(`${PREFIXES}SELECT * WHERE { ?s foaf:name ?n MINUS { ?s foaf:knows ?f } }`)).resolves
        .toBe(`project (n,s)
  minus
    join-minus(hash-def) cardReal:1 timeSelf:Xms timeLife:Xms
      pattern (?s http://xmlns.com/foaf/0.1/name ?n) cardEst:5 src:0
      pattern (?s http://xmlns.com/foaf/0.1/knows ?f) cardEst:5 src:0
${SOURCES_ONE}`);
    });

    it('explains an ask', async() => {
      await expect(explainPhysical(`${PREFIXES}ASK { ?s foaf:name ?n }`)).resolves.toBe(`ask
  pattern (?s http://xmlns.com/foaf/0.1/name ?n) src:0
${SOURCES_ONE}`);
    });

    it('explains a construct', async() => {
      await expect(explainPhysical(`${PREFIXES}CONSTRUCT { ?s ex:n ?n } WHERE { ?s foaf:name ?n }`)).resolves.toBe(`construct
  project (s,n)
    pattern (?s http://xmlns.com/foaf/0.1/name ?n) src:0
${SOURCES_ONE}`);
    });

    it('explains a describe', async() => {
      await expect(explainPhysical(`${PREFIXES}DESCRIBE ex:alice`)).resolves.toBe(`union
  construct
    project (__predicate,__object)
      pattern (http://example.org/alice ?__predicate ?__object) src:0
${SOURCES_ONE}`);
    });

    it('explains values', async() => {
      await expect(explainPhysical(`${PREFIXES}SELECT * WHERE { VALUES ?s { ex:alice } ?s foaf:name ?n }`)).resolves
        .toBe(`project (n,s)
  join
    join-inner(nested-loop) cardReal:1 timeSelf:Xms timeLife:Xms
      values cardEst:1
      pattern (?s http://xmlns.com/foaf/0.1/name ?n) cardEst:5 src:0
${SOURCES_ONE}`);
    });

    it('explains a subquery', async() => {
      const plan = await explainPhysical(
        `${PREFIXES}SELECT * WHERE { ?s foaf:name ?n . { SELECT ?s WHERE { ?s foaf:age ?a } } }`,
      );
      expect(normalizeCardinalities(plan)).toBe(`project (n,s)
  join
    join-inner(hash-def) cardReal:X timeSelf:Xms timeLife:Xms
      pattern (?s http://xmlns.com/foaf/0.1/name ?n) cardEst:5 src:0
      project (s) cardEst:5
        join
          join-inner(single) cardReal:X timeSelf:Xms timeLife:Xms
            pattern (?s http://xmlns.com/foaf/0.1/age ?a) src:0
${SOURCES_ONE}`);
    });

    // KNOWN ISSUE (plan §2.6): every per-binding EXISTS evaluation becomes a sibling of the filter's
    // actual input, so the plan grows linearly with the number of bindings.
    it('explains a filter with exists', async() => {
      await expect(explainPhysical(
        `${PREFIXES}SELECT * WHERE { ?s foaf:name ?n FILTER EXISTS { ?s foaf:knows ?f } }`,
      )).resolves.toBe(`project (n,s)
  filter
    pattern (?s http://xmlns.com/foaf/0.1/name ?n) src:0
    pattern (http://example.org/alice http://xmlns.com/foaf/0.1/knows ?f) src:0
    pattern (http://example.org/bob http://xmlns.com/foaf/0.1/knows ?f) src:0
    pattern (http://example.org/carol http://xmlns.com/foaf/0.1/knows ?f) src:0
    pattern (http://example.org/dave http://xmlns.com/foaf/0.1/knows ?f) src:0
    pattern (http://example.org/eve http://xmlns.com/foaf/0.1/knows ?f) src:0
${SOURCES_ONE}`);
    });

    it('explains a graph', async() => {
      await expect(explainPhysical(`${PREFIXES}SELECT * WHERE { GRAPH ?g { ?s ?p ?o } }`)).resolves.toBe(`project (g,o,p,s)
  pattern (?s ?p ?o ?g) src:0
${SOURCES_ONE}`);
    });

    it('explains a join that is short-circuited on a zero cardinality', async() => {
      await expect(explainPhysical(`${PREFIXES}SELECT * WHERE { ?s ex:nothing ?x . ?s foaf:age ?a }`)).resolves
        .toBe(`project (a,s,x)
  join
    join-inner(empty)
      pattern (?s http://example.org/nothing ?x) src:0
      pattern (?s http://xmlns.com/foaf/0.1/age ?a) src:0
${SOURCES_ONE}`);
    });

    it('explains an update', async() => {
      await expect(explainPhysical(
        `${PREFIXES}DELETE { ?s foaf:age ?a } INSERT { ?s foaf:age 1 } WHERE { ?s foaf:age ?a }`,
        { destination: createStore() },
      )).resolves.toBe(`deleteinsert
  pattern (?s http://xmlns.com/foaf/0.1/age ?a) src:0
${SOURCES_ONE}`);
    });

    it('explains a federated query over two sources', async() => {
      await expect(explainPhysical(
        `${PREFIXES}SELECT * WHERE { ?s foaf:name ?n . ?s foaf:age ?a }`,
        { sources: [ createStore(), createStore() ]},
      )).resolves.toBe(`project (a,n,s)
  join
    join-inner(hash-def) cardReal:20 timeSelf:Xms timeLife:Xms
      union cardEst:10
        pattern (?s http://xmlns.com/foaf/0.1/name ?n) src:0
        pattern (?s http://xmlns.com/foaf/0.1/name ?n) src:1
      union cardEst:10
        pattern (?s http://xmlns.com/foaf/0.1/age ?a) src:0
        pattern (?s http://xmlns.com/foaf/0.1/age ?a) src:1

sources:
  0: QuerySourceRdfJs(N3Store)(SkolemID:0)
  1: QuerySourceRdfJs(N3Store)(SkolemID:1)`);
    });
  });

  describe('in physical-json mode', () => {
    it('explains a two-pattern BGP', async() => {
      const data = await explainPhysicalJson(`${PREFIXES}SELECT * WHERE { ?s foaf:name ?n . ?s foaf:age ?a }`);
      expect(data).toEqual({
        logical: 'project',
        variables: [ 'a', 'n', 's' ],
        children: [
          {
            logical: 'join',
            children: [
              {
                logical: 'join-inner',
                physical: 'hash-def',
                cardinalities: [
                  { type: 'exact', value: 5 },
                  { type: 'exact', value: 5 },
                ],
                joinCoefficients: {
                  iterations: 8,
                  persistedItems: 5,
                  blockingItems: 5,
                  requestTime: 0,
                },
                cardinalityReal: 5,
                timeSelf: expect.any(Number),
                timeLife: expect.any(Number),
                children: [
                  {
                    logical: 'pattern',
                    source: 'QuerySourceRdfJs(N3Store)(SkolemID:0)',
                    pattern: '?s http://xmlns.com/foaf/0.1/name ?n',
                    cardinality: { type: 'exact', value: 5 },
                  },
                  {
                    logical: 'pattern',
                    source: 'QuerySourceRdfJs(N3Store)(SkolemID:0)',
                    pattern: '?s http://xmlns.com/foaf/0.1/age ?a',
                    cardinality: { type: 'exact', value: 5 },
                  },
                ],
              },
            ],
          },
        ],
      });
    });
  });

  describe('for queries containing a zero-entry join', () => {
    it('explains an empty where clause', async() => {
      await expect(explainPhysical(`${PREFIXES}SELECT * WHERE { }`)).resolves.toBe(`project ()
  join
    join-inner(none) cardReal:1 timeSelf:Xms timeLife:Xms`);
    });

    it('explains a query that only binds', async() => {
      await expect(explainPhysical(`${PREFIXES}SELECT * WHERE { BIND(1 AS ?x) }`)).resolves.toBe(`project (x)
  extend
    join
      join-inner(none) cardReal:1 timeSelf:Xms timeLife:Xms`);
    });
  });

  describe('with the wrap-stream join actor enabled', () => {
    // ActorRdfJoinWrapStream re-dispatches the same join action object, which used to collide with the
    // plan node of the join it wraps, silently dropping the join and its inputs.
    it('keeps the wrapped join and its inputs', async() => {
      const engine = await new QueryEngineFactory()
        .create({ configPath: join(__dirname, 'assets', 'config-join-wrap-stream.json') });
      const result = await engine.explain(
        `${PREFIXES}SELECT * WHERE { ?s foaf:name ?n . ?s foaf:age ?a }`,
        { sources: [ createStore() ]},
        'physical',
      );
      expect(normalize(<string> result.data)).toBe(`project (a,n,s)
  join
    join-inner(wrap-stream)
      join-inner(hash-def) cardReal:5 timeSelf:Xms timeLife:Xms
        pattern (?s http://xmlns.com/foaf/0.1/name ?n) cardEst:5 src:0
        pattern (?s http://xmlns.com/foaf/0.1/age ?a) cardEst:5 src:0
${SOURCES_ONE}`);
    }, 60_000);
  });

  describe('determinism', () => {
    // KNOWN ISSUE (plan §2.4): plan node metadata is appended from a floating promise that nothing
    // awaits, so repeated runs of the same query over the same data produce different plans.
    it.failing('produces the same plan for repeated runs of a nested optional', async() => {
      const query = `${PREFIXES}SELECT * WHERE {
        ?s foaf:name ?n OPTIONAL { ?s foaf:knows ?f OPTIONAL { ?f foaf:age ?fa } }
      }`;
      const plans = new Set<string>();
      for (let i = 0; i < 15; i++) {
        plans.add(await explainPhysical(query));
      }
      expect([ ...plans ]).toHaveLength(1);
    }, 60_000);
  });
});
