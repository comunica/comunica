import { QueryEngine } from '../lib/QueryEngine';
import { MockFederation } from './util-federation';

const A = 'http://a.example.org/sparql';
const B = 'http://b.example.org/sparql';
const ITEMS = 2_500;
const CAP = 1_000;

function lines(fn: (i: number) => string): string {
  return [ '@prefix ex: <http://example.org/> .', ...Array.from({ length: ITEMS }, (_, i) => fn(i)) ].join('\n');
}

/**
 * Regression test for endpoints that silently return at most a fixed number of results per query,
 * such as TriplyDB, which returns at most 10,000 results without any indication.
 * Before, all results beyond that number were lost.
 */
describe('System test: QuerySparql federation with endpoints that cap their results', () => {
  let engine: QueryEngine;
  let federation: MockFederation;

  /**
   * The fetch function of the federation, of which SELECT responses contain at most CAP results.
   */
  async function cappedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const response = await federation.fetch(input, init);
    if (response.headers.get('content-type') !== 'application/sparql-results+json') {
      return response;
    }
    const json = await response.json();
    json.results.bindings = json.results.bindings.slice(0, CAP);
    return new Response(JSON.stringify(json), { status: 200, headers: response.headers });
  }

  beforeEach(() => {
    engine = new QueryEngine();
    federation = new MockFederation({
      [A]: lines(i => `ex:s${i} ex:p ex:o${i} .`),
      [B]: lines(i => `ex:o${i} ex:q "${i}" .`),
    });
  });

  afterEach(async() => {
    await federation.idle();
  });

  it('continues results that may be capped with pages', async() => {
    const bindings = await (await engine.queryBindings(`
      PREFIX ex: <http://example.org/>
      SELECT ?s ?v WHERE { ?s ex:p ?o . ?o ex:q ?v }`, {
      sources: federation.sources,
      fetch: cappedFetch,
    })).toArray();

    expect(bindings).toHaveLength(ITEMS);
    expect(new Set(bindings.map(binding => binding.get('s')!.value)).size).toBe(ITEMS);
    // The capped pattern was continued with pages
    expect(federation.queriesTo(A).some(query => /OFFSET 1000/u.test(query))).toBe(true);
  });
});
