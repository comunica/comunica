import { QueryEngine } from '../lib/QueryEngine';
import { MockFederation } from './util-federation';

const A = 'http://a.example.org/sparql';
const B = 'http://b.example.org/sparql';

/**
 * Regression test for SPARQL endpoints that redirect requests without a query, such as for their service description,
 * to another page, as the ldmax.nl endpoints of the NDE dataset register do.
 * Before, the URL of that page replaced the URL of the endpoint, so queries were sent to the page.
 */
describe('System test: QuerySparql federation with endpoints that redirect their service description', () => {
  let engine: QueryEngine;
  let federation: MockFederation;

  beforeEach(() => {
    engine = new QueryEngine();
    federation = new MockFederation({
      [A]: `@prefix ex: <http://example.org/> . ex:s1 ex:p ex:o1 .`,
      [B]: `@prefix ex: <http://example.org/> . ex:o1 ex:q "one" .`,
    }, (request) => {
      if (!request.query) {
        // A redirect to a page that is not the endpoint, as the fetch function reports it after following it
        const response = new Response('<html></html>', { status: 200, headers: { 'content-type': 'text/html' }});
        Object.defineProperty(response, 'url', { value: `${request.endpoint.replace('/sparql', '')}/about` });
        return response;
      }
    });
  });

  it('sends queries to the given endpoint URLs', async() => {
    const bindings = await (await engine.queryBindings(`
      PREFIX ex: <http://example.org/>
      SELECT ?s ?v WHERE { ?s ex:p ?o . ?o ex:q ?v }`, {
      sources: federation.sources,
      fetch: federation.fetch,
    })).toArray();

    expect(bindings.map(binding => `${binding.get('s')!.value} ${binding.get('v')!.value}`))
      .toEqual([ 'http://example.org/s1 one' ]);
    expect(federation.requests.filter(request => request.query)
      .every(request => request.endpoint === A || request.endpoint === B)).toBe(true);
  });
});
