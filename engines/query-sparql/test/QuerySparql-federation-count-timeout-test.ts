import { join } from 'node:path';
import { QueryEngineFactory } from '../lib/QueryEngineFactory';
import { MockFederation } from './util-federation';

const A = 'http://a.example.org/sparql';
const B = 'http://b.example.org/sparql';

/**
 * Collect the cardinalities of all nodes of a physical plan.
 */
function cardinalities(node: any, values: number[] = []): number[] {
  if (node.cardinality) {
    values.push(node.cardinality.value);
  }
  for (const child of node.children ?? []) {
    cardinalities(child, values);
  }
  return values;
}

/**
 * Regression test for COUNT requests that wait in the HTTP layer before they are sent,
 * here for the delay before a retry of a rate-limited request, with a count timeout of 100 ms.
 * Before, the count timeout started before that wait,
 * so such COUNT requests were estimated as infinity, even if the endpoint answered them right away.
 */
describe('System test: QuerySparql federation with COUNT requests that wait before they are sent', () => {
  let federation: MockFederation;
  let limitedQuery: string | undefined;

  beforeEach(() => {
    limitedQuery = undefined;
    federation = new MockFederation({
      [A]: `@prefix ex: <http://example.org/> . ex:s1 ex:p ex:o1 .`,
      [B]: `@prefix ex: <http://example.org/> . ex:o1 ex:q "one" .`,
    }, (request) => {
      // The first COUNT request to A is rate-limited
      if (request.endpoint === A && request.query?.includes('COUNT') && !limitedQuery) {
        limitedQuery = request.query;
        return new Response('Too Many Requests', { status: 429 });
      }
    });
  });

  afterEach(async() => {
    await federation.idle();
  });

  it('starts the count timeout when the COUNT request is sent', async() => {
    const engine = await new QueryEngineFactory()
      .create({ configPath: join(__dirname, 'assets', 'config-count-timeout.json') });
    const plan = await engine.explain('PREFIX ex: <http://example.org/> SELECT * WHERE { ?s ex:p ?o . ?o ex:q ?v }', {
      sources: federation.sources,
      fetch: federation.fetch,
      // The retry is sent after 300 ms, which is longer than the count timeout
      httpRetryCount: 1,
      httpRetryDelayFallback: 300,
    }, 'physical-json');

    // The rate-limited COUNT request was sent again, and answered in time
    expect(limitedQuery).toBeDefined();
    expect(federation.queriesTo(A).filter(query => query === limitedQuery)).toHaveLength(2);
    const values = cardinalities(plan.data);
    expect(values.length).toBeGreaterThan(0);
    expect(values.every(value => Number.isFinite(value))).toBe(true);
  }, 30_000);
});
