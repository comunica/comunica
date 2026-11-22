import { QueryEngine } from '../lib/QueryEngine';
import { MockFederation } from './util-federation';

const A = 'http://a.example.org/sparql';
const B = 'http://b.example.org/sparql';

/**
 * Regression test for retrying rate-limited requests without any retry settings in the context.
 * Before, a single 429 or 503 response of one endpoint failed the whole query.
 */
describe('System test: QuerySparql federation with a rate-limiting endpoint', () => {
  let engine: QueryEngine;
  let federation: MockFederation;
  let limitedQuery: string | undefined;

  beforeEach(() => {
    engine = new QueryEngine();
  });

  afterEach(async() => {
    await federation.idle();
  });

  function createFederation(status: number): MockFederation {
    limitedQuery = undefined;
    federation = new MockFederation({
      [A]: `@prefix ex: <http://example.org/> . ex:s1 ex:p ex:o1 . ex:s2 ex:p ex:o2 .`,
      [B]: `@prefix ex: <http://example.org/> . ex:o1 ex:q "one" . ex:o2 ex:q "two" .`,
    }, (request) => {
      // The first query to B is rate-limited
      if (request.endpoint === B && request.query && !request.query.includes('COUNT') && !limitedQuery) {
        limitedQuery = request.query;
        return new Response('Too many requests', { status, headers: { 'retry-after': '0' }});
      }
    });
    return federation;
  }

  it.each([ 429, 503 ])('retries a request that is answered with status %d', async(status) => {
    createFederation(status);
    const bindings = await (await engine.queryBindings(`
      PREFIX ex: <http://example.org/>
      SELECT ?s ?v WHERE { ?s ex:p ?o . ?o ex:q ?v }`, {
      sources: federation.sources,
      fetch: federation.fetch,
    })).toArray();

    expect(bindings.map(binding => `${binding.get('s')!.value} ${binding.get('v')!.value}`).sort()).toEqual([
      'http://example.org/s1 one',
      'http://example.org/s2 two',
    ]);
    // The rate-limited request was sent again
    expect(limitedQuery).toBeDefined();
    expect(federation.queriesTo(B).filter(query => query === limitedQuery)).toHaveLength(2);
  });
});
