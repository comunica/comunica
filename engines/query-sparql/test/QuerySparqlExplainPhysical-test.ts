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
 * Explain with the statistics of each operator, which the corpus pins down in full.
 */
async function explainPhysical(query: string, context: any = {}): Promise<string> {
  const engine = new QueryEngine();
  const result = await engine.explain(query, { sources: [ createStore() ], ...context }, 'physical-stats');
  return normalize(<string> result.data);
}

/**
 * Explain without statistics, which is what `physical` reports by default.
 */
async function explainPhysicalPlain(query: string, context: any = {}): Promise<string> {
  const engine = new QueryEngine();
  const result = await engine.explain(query, { sources: [ createStore() ], ...context }, 'physical');
  return normalize(<string> result.data);
}

async function explainPhysicalJson(query: string, context: any = {}): Promise<any> {
  const engine = new QueryEngine();
  const result = await engine.explain(query, { sources: [ createStore() ], ...context }, 'physical-json');
  return result.data;
}

/**
 * Regression harness for the `physical`, `physical-stats` and `physical-json` explain modes.
 *
 * These tests pin down the exact physical plan for a corpus of queries, so that any change to the
 * physical query plan logger becomes visible. Unless a test says otherwise, they report the plan
 * with statistics, as that is the output that holds everything.
 */
describe('System test: QuerySparql explain physical', () => {
  describe('for queries over an in-memory source', () => {
    it('explains a single pattern', async() => {
      await expect(explainPhysical(`${PREFIXES}SELECT * WHERE { ?s ?p ?o }`)).resolves.toBe(`project (o,p,s) cardEst:20 cardReal:20 timeSelf:Xms timeLife:Xms
  pattern (?s ?p ?o) src:0 cardEst:20 cardReal:20 timeSelf:Xms timeLife:Xms

sources:
  0: QuerySourceRdfJs(N3Store)(SkolemID:0)`);
    });

    it('explains a two-pattern BGP', async() => {
      await expect(explainPhysical(`${PREFIXES}SELECT * WHERE { ?s foaf:name ?n . ?s foaf:age ?a }`)).resolves
        .toBe(`project (a,n,s) cardEst:~5 cardReal:5 timeSelf:Xms timeLife:Xms
  join cardEst:~5 cardReal:5 timeSelf:Xms timeLife:Xms
    join-inner(hash-def) cardEst:~5 cardReal:5 timeSelf:Xms timeLife:Xms
      pattern (?s http://xmlns.com/foaf/0.1/name ?n) src:0 cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms
      pattern (?s http://xmlns.com/foaf/0.1/age ?a) src:0 cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms

sources:
  0: QuerySourceRdfJs(N3Store)(SkolemID:0)`);
    });

    it('explains a three-pattern BGP', async() => {
      await expect(explainPhysical(
        `${PREFIXES}SELECT * WHERE { ?s foaf:name ?n . ?s foaf:age ?a . ?s foaf:knows ?f }`,
      )).resolves.toBe(`project (a,f,n,s) cardEst:~5 cardReal:5 timeSelf:Xms timeLife:Xms
  join cardEst:~5 cardReal:5 timeSelf:Xms timeLife:Xms
    join-inner(multi-smallest) cardEst:~5 cardReal:5 timeSelf:Xms timeLife:Xms
      join-inner(hash-def) cardEst:~5 cardReal:5 timeSelf:Xms timeLife:Xms
        pattern (?s http://xmlns.com/foaf/0.1/knows ?f) src:0 cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms
        join-inner(hash-def) cardEst:~5 cardReal:5 timeSelf:Xms timeLife:Xms
          pattern (?s http://xmlns.com/foaf/0.1/name ?n) src:0 cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms
          pattern (?s http://xmlns.com/foaf/0.1/age ?a) src:0 cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms

sources:
  0: QuerySourceRdfJs(N3Store)(SkolemID:0)`);
    });

    it('explains a filter', async() => {
      await expect(explainPhysical(`${PREFIXES}SELECT * WHERE { ?s foaf:age ?a FILTER(?a > 25) }`)).resolves
        .toBe(`project (a,s) cardEst:5 cardReal:3 timeSelf:Xms timeLife:Xms
  filter cardEst:5 cardReal:3 timeSelf:Xms timeLife:Xms
    pattern (?s http://xmlns.com/foaf/0.1/age ?a) src:0 cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms

sources:
  0: QuerySourceRdfJs(N3Store)(SkolemID:0)`);
    });

    // Both inputs of the bind join are nodes of their own: the pattern that drives the binding, and
    // the pattern that is only probed for its metadata before being bound per binding.
    it('explains an optional', async() => {
      await expect(explainPhysical(`${PREFIXES}SELECT * WHERE { ?s foaf:name ?n OPTIONAL { ?s foaf:knows ?f } }`)).resolves
        .toBe(`project (f,n,s) cardEst:~5 cardReal:6 timeSelf:Xms timeLife:Xms
  leftjoin cardEst:~5 cardReal:6 timeSelf:Xms timeLife:Xms
    join-optional(bind) cardEst:~5 cardReal:6 timeSelf:Xms timeLife:Xms
      pattern (?s http://xmlns.com/foaf/0.1/name ?n) src:0 cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms
      pattern (?s http://xmlns.com/foaf/0.1/knows ?f) src:0 cardEst:5 cardReal:0 timeSelf:Xms timeLife:Xms
      bindings
        pattern (http://example.org/alice http://xmlns.com/foaf/0.1/knows ?f) src:0 cardEst:2 cardReal:2 timeSelf:Xms timeLife:Xms compacted-occurrences:5 cardRealSum:5 timeSelfSum:Xms timeLifeSum:Xms

sources:
  0: QuerySourceRdfJs(N3Store)(SkolemID:0)`);
    });

    it('explains a union', async() => {
      await expect(explainPhysical(`${PREFIXES}SELECT * WHERE { { ?s foaf:name ?n } UNION { ?s foaf:age ?a } }`)).resolves
        .toBe(`project (a,n,s) cardEst:10 cardReal:10 timeSelf:Xms timeLife:Xms
  union cardEst:10 cardReal:10 timeSelf:Xms timeLife:Xms
    pattern (?s http://xmlns.com/foaf/0.1/name ?n) src:0 cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms
    pattern (?s http://xmlns.com/foaf/0.1/age ?a) src:0 cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms

sources:
  0: QuerySourceRdfJs(N3Store)(SkolemID:0)`);
    });

    it('explains a distinct with order and limit', async() => {
      await expect(explainPhysical(`${PREFIXES}SELECT DISTINCT ?n WHERE { ?s foaf:name ?n } ORDER BY ?n LIMIT 3`)).resolves
        .toBe(`slice cardEst:3 cardReal:3 timeSelf:Xms timeLife:Xms
  distinct cardEst:5 cardReal:3 timeSelf:Xms timeLife:Xms destroyed
    project (n) cardEst:5 cardReal:3 timeSelf:Xms timeLife:Xms destroyed
      orderby cardEst:5 cardReal:3 timeSelf:Xms timeLife:Xms destroyed
        pattern (?s http://xmlns.com/foaf/0.1/name ?n) src:0 cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms

sources:
  0: QuerySourceRdfJs(N3Store)(SkolemID:0)`);
    });

    it('explains a group by', async() => {
      await expect(explainPhysical(`${PREFIXES}SELECT (COUNT(?s) AS ?c) WHERE { ?s foaf:name ?n } GROUP BY ?n`)).resolves
        .toBe(`project (c) cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms
  extend cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms
    group cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms
      pattern (?s http://xmlns.com/foaf/0.1/name ?n) src:0 cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms

sources:
  0: QuerySourceRdfJs(N3Store)(SkolemID:0)`);
    });

    it('explains a property path', async() => {
      await expect(explainPhysical(`${PREFIXES}SELECT * WHERE { ?s foaf:knows+ ?o }`)).resolves.toBe(`project (o,s) cardEst:5 cardReal:10 timeSelf:Xms timeLife:Xms
  path cardEst:5 cardReal:10 timeSelf:Xms timeLife:Xms
    distinct cardEst:5 cardReal:10 timeSelf:Xms timeLife:Xms
      path cardEst:5 cardReal:13 timeSelf:Xms timeLife:Xms
        distinct cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms
          path cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms
            pattern (?s http://xmlns.com/foaf/0.1/knows ?o) src:0 cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms
        alp
          path cardEst:2 cardReal:2 timeSelf:Xms timeLife:Xms compacted-occurrences:4 cardRealSum:4 timeSelfSum:Xms timeLifeSum:Xms
            pattern (http://example.org/alice http://xmlns.com/foaf/0.1/knows ?b) src:0 cardEst:2 cardReal:2 timeSelf:Xms timeLife:Xms

sources:
  0: QuerySourceRdfJs(N3Store)(SkolemID:0)`);
    });

    it('explains a minus', async() => {
      await expect(explainPhysical(`${PREFIXES}SELECT * WHERE { ?s foaf:name ?n MINUS { ?s foaf:knows ?f } }`)).resolves
        .toBe(`project (n,s) cardEst:5 cardReal:1 timeSelf:Xms timeLife:Xms
  minus cardEst:5 cardReal:1 timeSelf:Xms timeLife:Xms
    join-minus(hash-def) cardEst:5 cardReal:1 timeSelf:Xms timeLife:Xms
      pattern (?s http://xmlns.com/foaf/0.1/name ?n) src:0 cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms
      pattern (?s http://xmlns.com/foaf/0.1/knows ?f) src:0 cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms

sources:
  0: QuerySourceRdfJs(N3Store)(SkolemID:0)`);
    });

    it('explains an ask', async() => {
      await expect(explainPhysical(`${PREFIXES}ASK { ?s foaf:name ?n }`)).resolves.toBe(`ask
  pattern (?s http://xmlns.com/foaf/0.1/name ?n) src:0 cardEst:5 cardReal:1 timeSelf:Xms timeLife:Xms destroyed

sources:
  0: QuerySourceRdfJs(N3Store)(SkolemID:0)`);
    });

    it('explains a construct', async() => {
      await expect(explainPhysical(`${PREFIXES}CONSTRUCT { ?s ex:n ?n } WHERE { ?s foaf:name ?n }`)).resolves.toBe(`construct cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms
  project (s,n) cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms
    pattern (?s http://xmlns.com/foaf/0.1/name ?n) src:0 cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms

sources:
  0: QuerySourceRdfJs(N3Store)(SkolemID:0)`);
    });

    it('explains a describe', async() => {
      await expect(explainPhysical(`${PREFIXES}DESCRIBE ex:alice`)).resolves.toBe(`union cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms
  construct cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms
    project (__predicate,__object) cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms
      pattern (http://example.org/alice ?__predicate ?__object) src:0 cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms

sources:
  0: QuerySourceRdfJs(N3Store)(SkolemID:0)`);
    });

    it('explains values', async() => {
      await expect(explainPhysical(`${PREFIXES}SELECT * WHERE { VALUES ?s { ex:alice } ?s foaf:name ?n }`)).resolves
        .toBe(`project (n,s) cardEst:~1 cardReal:1 timeSelf:Xms timeLife:Xms
  join cardEst:~1 cardReal:1 timeSelf:Xms timeLife:Xms
    join-inner(nested-loop) cardEst:~1 cardReal:1 timeSelf:Xms timeLife:Xms
      values cardEst:1 cardReal:1 timeSelf:Xms timeLife:Xms
      pattern (?s http://xmlns.com/foaf/0.1/name ?n) src:0 cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms

sources:
  0: QuerySourceRdfJs(N3Store)(SkolemID:0)`);
    });

    it('explains a subquery', async() => {
      await expect(explainPhysical(
        `${PREFIXES}SELECT * WHERE { ?s foaf:name ?n . { SELECT ?s WHERE { ?s foaf:age ?a } } }`,
      )).resolves.toBe(`project (n,s) cardEst:~5 cardReal:5 timeSelf:Xms timeLife:Xms
  join cardEst:~5 cardReal:5 timeSelf:Xms timeLife:Xms
    join-inner(hash-def) cardEst:~5 cardReal:5 timeSelf:Xms timeLife:Xms
      pattern (?s http://xmlns.com/foaf/0.1/name ?n) src:0 cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms
      project (s) cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms
        pattern (?s http://xmlns.com/foaf/0.1/age ?a) src:0 cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms

sources:
  0: QuerySourceRdfJs(N3Store)(SkolemID:0)`);
    });

    it('explains a filter with exists', async() => {
      await expect(explainPhysical(
        `${PREFIXES}SELECT * WHERE { ?s foaf:name ?n FILTER EXISTS { ?s foaf:knows ?f } }`,
      )).resolves.toBe(`project (n,s) cardEst:5 cardReal:4 timeSelf:Xms timeLife:Xms
  filter cardEst:5 cardReal:4 timeSelf:Xms timeLife:Xms
    pattern (?s http://xmlns.com/foaf/0.1/name ?n) src:0 cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms
    exists
      pattern (http://example.org/alice http://xmlns.com/foaf/0.1/knows ?f) src:0 cardEst:2 cardReal:2 timeSelf:Xms timeLife:Xms compacted-occurrences:5 cardRealSum:5 timeSelfSum:Xms timeLifeSum:Xms

sources:
  0: QuerySourceRdfJs(N3Store)(SkolemID:0)`);
    });

    // Each exists expression keeps a group of its own, so the repetitions of one are never
    // summarized together with those of another.
    it('explains a filter with two exists expressions', async() => {
      await expect(explainPhysical(
        `${PREFIXES}SELECT * WHERE { ?s foaf:name ?n FILTER(EXISTS { ?s foaf:knows ?f } && EXISTS { ?s foaf:age ?a }) }`,
      )).resolves.toBe(`project (n,s) cardEst:5 cardReal:4 timeSelf:Xms timeLife:Xms
  filter cardEst:5 cardReal:4 timeSelf:Xms timeLife:Xms
    pattern (?s http://xmlns.com/foaf/0.1/name ?n) src:0 cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms
    exists
      pattern (http://example.org/alice http://xmlns.com/foaf/0.1/age ?a) src:0 cardEst:1 cardReal:1 timeSelf:Xms timeLife:Xms compacted-occurrences:5 cardRealSum:5 timeSelfSum:Xms timeLifeSum:Xms
    exists
      pattern (http://example.org/alice http://xmlns.com/foaf/0.1/knows ?f) src:0 cardEst:2 cardReal:2 timeSelf:Xms timeLife:Xms compacted-occurrences:5 cardRealSum:5 timeSelfSum:Xms timeLifeSum:Xms

sources:
  0: QuerySourceRdfJs(N3Store)(SkolemID:0)`);
    });

    it('explains a graph', async() => {
      await expect(explainPhysical(`${PREFIXES}SELECT * WHERE { GRAPH ?g { ?s ?p ?o } }`)).resolves.toBe(`project (g,o,p,s) cardEst:~20 cardReal:0 timeSelf:Xms timeLife:Xms
  pattern (?s ?p ?o ?g) src:0 cardEst:~20 cardReal:0 timeSelf:Xms timeLife:Xms

sources:
  0: QuerySourceRdfJs(N3Store)(SkolemID:0)`);
    });

    it('explains a join that is short-circuited on a zero cardinality', async() => {
      await expect(explainPhysical(`${PREFIXES}SELECT * WHERE { ?s ex:nothing ?x . ?s foaf:age ?a }`)).resolves
        .toBe(`project (a,s,x) cardEst:0 cardReal:0 timeSelf:Xms timeLife:Xms
  join cardEst:0 cardReal:0 timeSelf:Xms timeLife:Xms
    join-inner(empty)
      pattern (?s http://example.org/nothing ?x) src:0 cardEst:0 cardReal:0 timeSelf:Xms timeLife:Xms
      pattern (?s http://xmlns.com/foaf/0.1/age ?a) src:0 cardEst:5 cardReal:0 timeSelf:Xms timeLife:Xms

sources:
  0: QuerySourceRdfJs(N3Store)(SkolemID:0)`);
    });

    it('explains an update', async() => {
      await expect(explainPhysical(
        `${PREFIXES}DELETE { ?s foaf:age ?a } INSERT { ?s foaf:age 1 } WHERE { ?s foaf:age ?a }`,
        { destination: createStore() },
      )).resolves.toBe(`deleteinsert
  pattern (?s http://xmlns.com/foaf/0.1/age ?a) src:0 cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms

sources:
  0: QuerySourceRdfJs(N3Store)(SkolemID:0)`);
    });

    it('explains a federated query over two sources', async() => {
      await expect(explainPhysical(
        `${PREFIXES}SELECT * WHERE { ?s foaf:name ?n . ?s foaf:age ?a }`,
        { sources: [ createStore(), createStore() ]},
      )).resolves.toBe(`project (a,n,s) cardEst:~10 cardReal:20 timeSelf:Xms timeLife:Xms
  join cardEst:~10 cardReal:20 timeSelf:Xms timeLife:Xms
    join-inner(hash-def) cardEst:~10 cardReal:20 timeSelf:Xms timeLife:Xms
      union cardEst:10 cardReal:10 timeSelf:Xms timeLife:Xms
        pattern (?s http://xmlns.com/foaf/0.1/name ?n) src:0 cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms
        pattern (?s http://xmlns.com/foaf/0.1/name ?n) src:1 cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms
      union cardEst:10 cardReal:10 timeSelf:Xms timeLife:Xms
        pattern (?s http://xmlns.com/foaf/0.1/age ?a) src:0 cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms
        pattern (?s http://xmlns.com/foaf/0.1/age ?a) src:1 cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms

sources:
  0: QuerySourceRdfJs(N3Store)(SkolemID:0)
  1: QuerySourceRdfJs(N3Store)(SkolemID:1)`);
    });
  });

  describe('in physical mode', () => {
    it('reports what ran, without any statistics', async() => {
      await expect(explainPhysicalPlain(`${PREFIXES}SELECT * WHERE { ?s foaf:name ?n . ?s foaf:age ?a }`))
        .resolves.toBe(`project (a,n,s)
  join
    join-inner(hash-def)
      pattern (?s http://xmlns.com/foaf/0.1/name ?n) src:0
      pattern (?s http://xmlns.com/foaf/0.1/age ?a) src:0

sources:
  0: QuerySourceRdfJs(N3Store)(SkolemID:0)`);
    });

    it('summarizes repetition without the totals it stands for', async() => {
      await expect(explainPhysicalPlain(`${PREFIXES}SELECT * WHERE { ?s foaf:name ?n OPTIONAL { ?s foaf:knows ?f } }`))
        .resolves.toBe(`project (f,n,s)
  leftjoin
    join-optional(bind)
      pattern (?s http://xmlns.com/foaf/0.1/name ?n) src:0
      pattern (?s http://xmlns.com/foaf/0.1/knows ?f) src:0
      bindings
        pattern (http://example.org/alice http://xmlns.com/foaf/0.1/knows ?f) src:0 compacted-occurrences:5

sources:
  0: QuerySourceRdfJs(N3Store)(SkolemID:0)`);
    });
  });

  describe('in physical-json mode', () => {
    it('explains a two-pattern BGP', async() => {
      const data = await explainPhysicalJson(`${PREFIXES}SELECT * WHERE { ?s foaf:name ?n . ?s foaf:age ?a }`);
      expect(data).toEqual({
        logical: 'project',
        variables: [ 'a', 'n', 's' ],
        cardinality: { type: 'estimate', value: 5 },
        cardinalityReal: 5,
        timeSelf: expect.any(Number),
        timeLife: expect.any(Number),
        children: [
          {
            logical: 'join',
            cardinality: { type: 'estimate', value: 5 },
            cardinalityReal: 5,
            timeSelf: expect.any(Number),
            timeLife: expect.any(Number),
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
                cardinality: { type: 'estimate', value: 5 },
                cardinalityReal: 5,
                timeSelf: expect.any(Number),
                timeLife: expect.any(Number),
                children: [
                  {
                    logical: 'pattern',
                    source: 'QuerySourceRdfJs(N3Store)(SkolemID:0)',
                    pattern: '?s http://xmlns.com/foaf/0.1/name ?n',
                    cardinality: { type: 'exact', value: 5 },
                    cardinalityReal: 5,
                    timeSelf: expect.any(Number),
                    timeLife: expect.any(Number),
                  },
                  {
                    logical: 'pattern',
                    source: 'QuerySourceRdfJs(N3Store)(SkolemID:0)',
                    pattern: '?s http://xmlns.com/foaf/0.1/age ?a',
                    cardinality: { type: 'exact', value: 5 },
                    cardinalityReal: 5,
                    timeSelf: expect.any(Number),
                    timeLife: expect.any(Number),
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
      await expect(explainPhysical(`${PREFIXES}SELECT * WHERE { }`)).resolves.toBe(`project () cardEst:1 cardReal:1 timeSelf:Xms timeLife:Xms
  join cardEst:1 cardReal:1 timeSelf:Xms timeLife:Xms
    join-inner(none) cardEst:1 cardReal:1 timeSelf:Xms timeLife:Xms`);
    });

    it('explains a query that only binds', async() => {
      await expect(explainPhysical(`${PREFIXES}SELECT * WHERE { BIND(1 AS ?x) }`)).resolves.toBe(`project (x) cardEst:1 cardReal:1 timeSelf:Xms timeLife:Xms
  extend cardEst:1 cardReal:1 timeSelf:Xms timeLife:Xms
    join cardEst:1 cardReal:1 timeSelf:Xms timeLife:Xms
      join-inner(none) cardEst:1 cardReal:1 timeSelf:Xms timeLife:Xms`);
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
        'physical-stats',
      );
      expect(normalize(<string> result.data)).toBe(`project (a,n,s) cardEst:~5 cardReal:5 timeSelf:Xms timeLife:Xms
  join cardEst:~5 cardReal:5 timeSelf:Xms timeLife:Xms
    join-inner(wrap-stream) cardEst:~5 cardReal:5 timeSelf:Xms timeLife:Xms
      join-inner(hash-def) cardEst:~5 cardReal:5 timeSelf:Xms timeLife:Xms
        pattern (?s http://xmlns.com/foaf/0.1/name ?n) src:0 cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms
        pattern (?s http://xmlns.com/foaf/0.1/age ?a) src:0 cardEst:5 cardReal:5 timeSelf:Xms timeLife:Xms

sources:
  0: QuerySourceRdfJs(N3Store)(SkolemID:0)`);
    }, 60_000);
  });

  describe('determinism', () => {
    it('produces the same plan for repeated runs of a nested optional', async() => {
      const query = `${PREFIXES}SELECT * WHERE {
        ?s foaf:name ?n OPTIONAL { ?s foaf:knows ?f OPTIONAL { ?f foaf:age ?fa } }
      }`;
      const plans = new Set<string>();
      for (let i = 0; i < 15; i++) {
        plans.add(await explainPhysical(query));
      }
      expect([ ...plans ]).toHaveLength(1);
    }, 60_000);

    it('produces the same plan for repeated runs of a bind join under a limit', async() => {
      // A limit leaves the operators below it cut short. How far each of them got before the engine
      // tore them down is up to scheduling, and only shows in whether they report as destroyed, so
      // that is the one part of the plan that a limited query is allowed to differ in between runs.
      const query = `${PREFIXES}SELECT * WHERE { ?s foaf:name ?n OPTIONAL { ?s foaf:knows ?f } } LIMIT 2`;
      const plans = new Set<string>();
      for (let i = 0; i < 15; i++) {
        plans.add((await explainPhysical(query)).replaceAll(' destroyed', ''));
      }
      expect([ ...plans ]).toEqual([ `slice cardEst:~2 cardReal:2 timeSelf:Xms timeLife:Xms
  project (f,n,s) cardEst:~5 cardReal:2 timeSelf:Xms timeLife:Xms
    leftjoin cardEst:~5 cardReal:2 timeSelf:Xms timeLife:Xms
      join-optional(bind) cardEst:~5 cardReal:2 timeSelf:Xms timeLife:Xms
        pattern (?s http://xmlns.com/foaf/0.1/name ?n) src:0 cardEst:5 cardReal:4 timeSelf:Xms timeLife:Xms
        pattern (?s http://xmlns.com/foaf/0.1/knows ?f) src:0 cardEst:5 cardReal:0 timeSelf:Xms timeLife:Xms
        bindings
          pattern (http://example.org/alice http://xmlns.com/foaf/0.1/knows ?f) src:0 cardEst:2 cardReal:2 timeSelf:Xms timeLife:Xms compacted-occurrences:4 cardRealSum:4 timeSelfSum:Xms timeLifeSum:Xms

sources:
  0: QuerySourceRdfJs(N3Store)(SkolemID:0)` ]);
    }, 60_000);
  });
});
