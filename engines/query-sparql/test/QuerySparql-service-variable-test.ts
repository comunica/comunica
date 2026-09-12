import { DataFactory } from 'rdf-data-factory';
import { RdfStore } from 'rdf-stores';
import { QueryEngine } from '../lib/QueryEngine';

const DF = new DataFactory();
const EX = (local: string): ReturnType<typeof DF.namedNode> => DF.namedNode(`http://example.org/${local}`);

const ENDPOINT1 = 'http://endpoint1.example.org/sparql';
const ENDPOINT2 = 'http://endpoint2.example.org/sparql';

/**
 * System tests for SERVICE clauses of which the target is a variable.
 *
 * Such clauses can only be evaluated once another operation has bound their target,
 * so they require the query planner to defer them to a bind-join.
 * These tests place the clause in different positions relative to the operation binding its target,
 * to make sure the planner handles that deferral no matter where the clause occurs.
 */
describe('System test: QuerySparql with a variable SERVICE target', () => {
  let engine: QueryEngine;
  let calledEndpoints: string[];

  /**
   * A fetch function answering for both endpoints above, and 404 for anything else.
   * Each endpoint holds a single triple, so that results identify which endpoint was queried.
   */
  async function mockedFetch(input: string, init?: RequestInit): Promise<Response> {
    const url = new URL(input);
    const endpoint = `${url.origin}${url.pathname}`;
    const query = url.searchParams.get('query') ??
      (init?.body ? new URLSearchParams(String(init.body)).get('query') : null);
    if (endpoint !== ENDPOINT1 && endpoint !== ENDPOINT2) {
      return new Response(null, { status: 404 });
    }
    // Requests without a query are service description lookups
    if (!query) {
      return new Response('', { status: 200, headers: { 'content-type': 'text/turtle' }});
    }
    calledEndpoints.push(endpoint);
    const subject = endpoint === ENDPOINT1 ? 'http://example.org/a' : 'http://example.org/b';
    const value = endpoint === ENDPOINT1 ? '1' : '2';
    return new Response(
      JSON.stringify({
        head: { vars: [ 'x', 'v' ]},
        results: { bindings: [{ x: { type: 'uri', value: subject }, v: { type: 'literal', value }}]},
      }),
      { status: 200, headers: { 'content-type': 'application/sparql-results+json' }},
    );
  }

  /**
   * A local source binding ?e to each of the two endpoints.
   */
  function createContext(serviceAllowVariableTargets = true): any {
    const store = RdfStore.createDefault(true);
    store.addQuad(DF.quad(EX('p1'), EX('endpoint'), DF.namedNode(ENDPOINT1)));
    store.addQuad(DF.quad(EX('p2'), EX('endpoint'), DF.namedNode(ENDPOINT2)));
    return { sources: [ store ], fetch: mockedFetch, serviceAllowVariableTargets };
  }

  const PREFIX = 'PREFIX : <http://example.org/>\n';

  /**
   * The result of joining the local source with both endpoints, in any order.
   */
  const BOTH_ENDPOINTS = [
    { p: 'http://example.org/p1', x: 'http://example.org/a', v: '1' },
    { p: 'http://example.org/p2', x: 'http://example.org/b', v: '2' },
  ];

  async function queryRows(query: string, context = createContext()): Promise<Record<string, string>[]> {
    const bindings = await (await engine.queryBindings(query, context)).toArray();
    return bindings
      .map(binding => Object.fromEntries([ ...binding ].map(([ key, value ]) => [ key.value, value.value ])))
      .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  }

  beforeEach(() => {
    engine = new QueryEngine();
    calledEndpoints = [];
  });

  it('should evaluate a clause occurring after the pattern binding its target', async() => {
    await expect(queryRows(`${PREFIX}SELECT ?p ?x ?v WHERE {
      ?p :endpoint ?e .
      SERVICE ?e { ?x :val ?v }
    }`)).resolves.toEqual(BOTH_ENDPOINTS);
    expect(calledEndpoints.sort()).toEqual([ ENDPOINT1, ENDPOINT2 ]);
  });

  it('should evaluate a clause occurring before the pattern binding its target', async() => {
    await expect(queryRows(`${PREFIX}SELECT ?p ?x ?v WHERE {
      SERVICE ?e { ?x :val ?v }
      ?p :endpoint ?e .
    }`)).resolves.toEqual(BOTH_ENDPOINTS);
    expect(calledEndpoints.sort()).toEqual([ ENDPOINT1, ENDPOINT2 ]);
  });

  it('should evaluate a clause in a group before the pattern binding its target', async() => {
    await expect(queryRows(`${PREFIX}SELECT ?p ?x ?v WHERE {
      { SERVICE ?e { ?x :val ?v } }
      ?p :endpoint ?e .
    }`)).resolves.toEqual(BOTH_ENDPOINTS);
  });

  it('should evaluate a clause within OPTIONAL', async() => {
    await expect(queryRows(`${PREFIX}SELECT ?p ?x ?v WHERE {
      ?p :endpoint ?e .
      OPTIONAL { SERVICE ?e { ?x :val ?v } }
    }`)).resolves.toEqual(BOTH_ENDPOINTS);
  });

  it('should evaluate a clause within a UNION branch', async() => {
    await expect(queryRows(`${PREFIX}SELECT ?p ?x ?v WHERE {
      ?p :endpoint ?e .
      { SERVICE ?e { ?x :val ?v } } UNION { ?p :missing ?v }
    }`)).resolves.toEqual(BOTH_ENDPOINTS);
  });

  it('should evaluate a clause of which the target is bound by VALUES before it', async() => {
    await expect(queryRows(`${PREFIX}SELECT ?x ?v WHERE {
      VALUES ?e { <${ENDPOINT1}> }
      SERVICE ?e { ?x :val ?v }
    }`)).resolves.toEqual([{ x: 'http://example.org/a', v: '1' }]);
    expect(calledEndpoints).toEqual([ ENDPOINT1 ]);
  });

  it('should evaluate a clause of which the target is bound by VALUES after it', async() => {
    await expect(queryRows(`${PREFIX}SELECT ?x ?v WHERE {
      SERVICE ?e { ?x :val ?v }
      VALUES ?e { <${ENDPOINT1}> }
    }`)).resolves.toEqual([{ x: 'http://example.org/a', v: '1' }]);
    expect(calledEndpoints).toEqual([ ENDPOINT1 ]);
  });

  it('should evaluate a clause of which the target is bound by BIND', async() => {
    await expect(queryRows(`${PREFIX}SELECT ?x ?v WHERE {
      BIND(<${ENDPOINT1}> AS ?e)
      SERVICE ?e { ?x :val ?v }
    }`)).resolves.toEqual([{ x: 'http://example.org/a', v: '1' }]);
  });

  it('should evaluate a clause next to a FILTER over its results', async() => {
    await expect(queryRows(`${PREFIX}SELECT ?p ?x ?v WHERE {
      ?p :endpoint ?e .
      SERVICE ?e { ?x :val ?v }
      FILTER(?v = "1")
    }`)).resolves.toEqual([{ p: 'http://example.org/p1', x: 'http://example.org/a', v: '1' }]);
  });

  it('should evaluate multiple clauses with a variable target', async() => {
    await expect(queryRows(`${PREFIX}SELECT ?p ?x ?v WHERE {
      ?p :endpoint ?e .
      SERVICE ?e { ?x :val ?v }
      SERVICE ?e { ?x :val ?v2 }
    }`)).resolves.toEqual(BOTH_ENDPOINTS);
    expect(calledEndpoints).toHaveLength(4);
  });

  it('should evaluate a clause next to one with an IRI target', async() => {
    await expect(queryRows(`${PREFIX}SELECT ?p ?x ?v WHERE {
      ?p :endpoint ?e .
      SERVICE ?e { ?x :val ?v }
      SERVICE <${ENDPOINT1}> { ?y :val ?w }
    }`)).resolves.toEqual(BOTH_ENDPOINTS);
  });

  it('should not be allowed without serviceAllowVariableTargets', async() => {
    await expect(queryRows(`${PREFIX}SELECT ?p ?x ?v WHERE {
      ?p :endpoint ?e .
      SERVICE ?e { ?x :val ?v }
    }`, createContext(false)))
      .rejects.toThrow('SERVICE clauses with a variable target are not allowed by default');
    expect(calledEndpoints).toEqual([]);
  });

  it('should still allow clauses with an IRI target without serviceAllowVariableTargets', async() => {
    await expect(queryRows(`${PREFIX}SELECT ?x ?v WHERE {
      SERVICE <${ENDPOINT1}> { ?x :val ?v }
    }`, createContext(false))).resolves.toEqual([{ x: 'http://example.org/a', v: '1' }]);
  });

  it('should error when nothing binds the target', async() => {
    await expect(queryRows(`${PREFIX}SELECT ?x ?v WHERE {
      SERVICE ?e { ?x :val ?v }
    }`)).rejects.toThrow('Tried to evaluate a SERVICE clause with unbound variable ?e');
    expect(calledEndpoints).toEqual([]);
  });

  it('should error when nothing binds the target of a silent clause', async() => {
    await expect(queryRows(`${PREFIX}SELECT ?x ?v WHERE {
      SERVICE SILENT ?e { ?x :val ?v }
    }`)).rejects.toThrow('Tried to evaluate a SERVICE clause with unbound variable ?e');
  });
});
