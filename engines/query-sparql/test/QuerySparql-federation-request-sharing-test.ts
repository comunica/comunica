import { QueryEngine } from '../lib/QueryEngine';
import { MockFederation } from './util-federation';

const A = 'http://a.example.org/sparql';
const B = 'http://b.example.org/sparql';
const C = 'http://c.example.org/sparql';

function lines(count: number, fn: (i: number) => string): string {
  return [ '@prefix ex: <http://example.org/> .', ...Array.from({ length: count }, (_, i) => fn(i)) ].join('\n');
}

/**
 * Regression test for identical requests that a query sends while one of them is still in flight.
 * Here, both branches of a UNION contain the same pattern, so they sent the same queries
 * to the same endpoint at the same time, as did a federated query over the NDE dataset register.
 */
describe('System test: QuerySparql federation with overlapping sources', () => {
  let engine: QueryEngine;
  let federation: MockFederation;

  beforeEach(() => {
    engine = new QueryEngine();
    const camps = lines(3, i => `ex:camp${i} ex:label "Camp ${i}" .`);
    federation = new MockFederation({
      [A]: camps,
      [B]: camps,
      [C]: lines(300, i => `ex:object${i} ex:about ex:camp${i % 3} ; ex:type ex:${i % 2 ? 'Photo' : 'Letter'} .`),
    });
  });

  afterEach(async() => {
    await federation.idle();
  });

  it('sends identical requests only once while they are in flight', async() => {
    const bindings = await (await engine.queryBindings(`
      PREFIX ex: <http://example.org/>
      SELECT ?camp ?object WHERE {
        ?camp ex:label "Camp 1" .
        { ?object ex:about ?camp } UNION { ?object ex:about ?camp ; ex:type ex:Photo }
      }`, {
      sources: federation.sources,
      fetch: federation.fetch,
    })).toArray();

    // Both sources produce the camp, and the photos match both branches
    expect(bindings).toHaveLength(2 * (100 + 50));
    const queries = federation.queriesTo(C);
    expect(queries.length).toBeGreaterThan(0);
    expect(new Set(queries).size).toBe(queries.length);
  });
});
