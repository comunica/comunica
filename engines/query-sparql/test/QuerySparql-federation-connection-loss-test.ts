import { QueryEngine } from '../lib/QueryEngine';
import { MockFederation } from './util-federation';

const A = 'http://a.example.org/sparql';
const B = 'http://b.example.org/sparql';

/**
 * Create an error like the one of fetch when the server closes the connection while a request is in flight.
 */
function connectionLostError(code: string, message: string): Error {
  return new TypeError('fetch failed', { cause: Object.assign(new Error(message), { code }) });
}

/**
 * Regression test for retrying requests that lost their connection, without any retry settings in the context.
 * Some endpoints close connections while requests are in flight, such as with an HTTP/2 GOAWAY frame,
 * which failed the whole query.
 */
describe('System test: QuerySparql federation with an endpoint that closes connections', () => {
  let engine: QueryEngine;
  let federation: MockFederation;
  let failedQuery: string | undefined;

  beforeEach(() => {
    engine = new QueryEngine();
  });

  afterEach(async() => {
    await federation.idle();
  });

  function createFederation(error: Error): void {
    failedQuery = undefined;
    federation = new MockFederation({
      [A]: `@prefix ex: <http://example.org/> . ex:s1 ex:p ex:o1 . ex:s2 ex:p ex:o2 .`,
      [B]: `@prefix ex: <http://example.org/> . ex:o1 ex:q "one" . ex:o2 ex:q "two" .`,
    }, (request) => {
      // The connection of the first query to B is lost
      if (request.endpoint === B && request.query && !request.query.includes('COUNT') && !failedQuery) {
        failedQuery = request.query;
        throw error;
      }
    });
  }

  it.each([
    [ 'a reset connection', connectionLostError('ECONNRESET', 'read ECONNRESET') ],
    [ 'a closed socket', connectionLostError('UND_ERR_SOCKET', 'other side closed') ],
    [ 'an HTTP/2 GOAWAY frame', connectionLostError('UND_ERR_INFO', 'HTTP/2: "GOAWAY" frame received with code 0') ],
  ])('retries a request that failed on %s', async(_, error) => {
    createFederation(error);
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
    // The failed request was sent again
    expect(failedQuery).toBeDefined();
    expect(federation.queriesTo(B).filter(query => query === failedQuery)).toHaveLength(2);
  });
});
