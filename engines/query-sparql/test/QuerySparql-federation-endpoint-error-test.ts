import { QueryEngine } from '../lib/QueryEngine';
import { MockFederation } from './util-federation';

const A = 'http://a.example.org/sparql';
const B = 'http://b.example.org/sparql';

/**
 * Regression test for endpoints that answer queries with an error.
 * The query must reject with that error, instead of the error being emitted where nobody listens.
 */
describe('System test: QuerySparql federation with an endpoint that fails', () => {
  let engine: QueryEngine;

  beforeEach(() => {
    engine = new QueryEngine();
  });

  it.each([ 'select', 'all' ])('rejects the query if the endpoint fails on %s requests', async(failing) => {
    const federation = createFederation(failing);
    await expect(query(federation)).rejects.toThrow('404');
    await federation.idle();
  });

  it('estimates the cardinality if the endpoint fails on count requests', async() => {
    const federation = createFederation('count');
    await expect(query(federation)).resolves.toHaveLength(2);
    await federation.idle();
  });

  function createFederation(failing: string): MockFederation {
    return new MockFederation({
      [A]: `@prefix ex: <http://example.org/> . ex:s1 ex:p ex:o1 . ex:s2 ex:p ex:o2 .`,
      [B]: `@prefix ex: <http://example.org/> . ex:o1 ex:q "one" . ex:o2 ex:q "two" .`,
    }, (request) => {
      const isCount = request.query?.includes('COUNT');
      if (request.endpoint === B && request.query &&
        (failing === 'all' || (failing === 'count' ? isCount : !isCount))) {
        return new Response('Not found', { status: 404 });
      }
    });
  }

  async function query(federation: MockFederation): Promise<unknown[]> {
    return (await engine.queryBindings('PREFIX ex: <http://example.org/> SELECT * WHERE { ?s ex:p ?o . ?o ex:q ?v }', {
      sources: federation.sources,
      fetch: federation.fetch,
    })).toArray();
  }
});
