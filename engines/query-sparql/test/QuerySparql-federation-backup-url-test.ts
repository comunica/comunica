import { QueryEngine } from '../lib/QueryEngine';
import { MockFederation } from './util-federation';

const A = 'http://a.example.org/sparql';
const B = 'http://b.example.org/sparql';

/**
 * Regression test for SPARQL endpoints whose service description names an endpoint URL that does not exist,
 * so that requests fall back to the given URL.
 * Before, only the requests that failed before the first fallback were retried with the given URL,
 * and requests that were sent concurrently with it failed.
 */
describe('System test: QuerySparql federation with service descriptions that name a wrong endpoint URL', () => {
  it('retries every request that failed at the wrong URL with the given URL', async() => {
    const federation = new MockFederation({
      [A]: `@prefix ex: <http://example.org/> . ex:s1 ex:p ex:o1 . ex:s2 ex:p ex:o2 .`,
      [B]: `@prefix ex: <http://example.org/> . ex:o1 ex:q "one" . ex:o2 ex:q "two" .`,
    }, (request) => {
      if (!request.query) {
        return new Response(`@prefix sd: <http://www.w3.org/ns/sparql-service-description#> .
          <${request.endpoint}> a sd:Service ; sd:endpoint <${request.endpoint}-wrong> .`, {
          status: 200,
          headers: { 'content-type': 'text/turtle' },
        });
      }
    });
    const bindings = await (await new QueryEngine().queryBindings(`
      PREFIX ex: <http://example.org/>
      SELECT ?s ?v WHERE { ?s ex:p ?o . ?o ex:q ?v }`, {
      sources: [ A, B ],
      fetch: federation.fetch,
    })).toArray();
    expect(bindings.map(binding => `${binding.get('s')!.value} ${binding.get('v')!.value}`).sort())
      .toEqual([ 'http://example.org/s1 one', 'http://example.org/s2 two' ]);
    await federation.idle();
  });
});
