import { QueryEngine } from '../lib/QueryEngine';
import { MockFederation } from './util-federation';

const A = 'http://a.example.org/sparql';
const B = 'http://b.example.org/sparql';

/**
 * Regression test for requests that fail after the stream of their results was destroyed,
 * such as after another request of the query failed.
 * Their errors were emitted without listeners, which crashed the process.
 * Here, the service descriptions of forced SPARQL sources are found at another page,
 * of which the URL is then used for queries, which fail.
 */
describe('System test: QuerySparql federation with requests that fail after their stream is destroyed', () => {
  it('does not emit errors without listeners', async() => {
    const federation = new MockFederation({
      [A]: `@prefix ex: <http://example.org/> . ex:s1 ex:p ex:o1 .`,
      [B]: `@prefix ex: <http://example.org/> . ex:o1 ex:q "one" .`,
    }, (request) => {
      if (!request.query) {
        const response = new Response('<html></html>', { status: 200, headers: { 'content-type': 'text/html' }});
        Object.defineProperty(response, 'url', { value: `${request.endpoint.replace('/sparql', '')}/about` });
        return response;
      }
    });
    // The query may fail, if the URL of the page is used, or succeed, if the given URL is used
    await new QueryEngine().queryBindings('PREFIX ex: <http://example.org/> SELECT * WHERE { ?s ex:p ?o . ?o ex:q ?v }', {
      sources: federation.sources,
      fetch: federation.fetch,
    }).then(stream => stream.toArray()).catch(() => []);
    // Let later failures happen within the test
    await new Promise(resolve => setTimeout(resolve, 200));
    await federation.idle();
  });
});
