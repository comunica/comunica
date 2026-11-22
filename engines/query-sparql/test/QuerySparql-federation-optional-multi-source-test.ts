import { QueryEngine } from '../lib/QueryEngine';
import { MockFederation } from './util-federation';

const A = 'http://a.example.org/sparql';
const B = 'http://b.example.org/sparql';
const C = 'http://c.example.org/sparql';
const ITEMS = 100;
const OTHERS = 2_000;

/**
 * Data with labels for every other item, and many labels of other items.
 */
function labels(source: string, offset: number): string {
  const lines = [ '@prefix ex: <http://example.org/> .' ];
  for (let i = offset; i < ITEMS; i += 2) {
    lines.push(`ex:item${i} ex:label "Item ${i} at ${source}" .`);
  }
  for (let i = 0; i < OTHERS; i++) {
    lines.push(`ex:other${i} ex:label "Other ${i} at ${source}" .`);
  }
  return lines.join('\n');
}

/**
 * Regression test for OPTIONAL over an operation of which multiple sources have results.
 * Before, such an OPTIONAL was either evaluated once per left binding, with a request to each source,
 * or by fetching the operation in full.
 */
describe('System test: QuerySparql federation with an OPTIONAL over multiple sources', () => {
  let engine: QueryEngine;
  let federation: MockFederation;

  beforeEach(() => {
    engine = new QueryEngine();
    const items = [ '@prefix ex: <http://example.org/> .' ];
    for (let i = 0; i < ITEMS; i++) {
      items.push(`ex:item${i} a ex:Item .`);
    }
    federation = new MockFederation({
      [A]: items.join('\n'),
      [B]: labels('B', 0),
      [C]: labels('C', 1),
    });
  });

  afterEach(async() => {
    await federation.idle();
  });

  it('passes blocks of left bindings to each source of the OPTIONAL', async() => {
    const bindings = await (await engine.queryBindings(`
      PREFIX ex: <http://example.org/>
      SELECT ?item ?label WHERE {
        ?item a ex:Item .
        OPTIONAL { ?item ex:label ?label }
      }`, { sources: federation.sources, fetch: federation.fetch })).toArray();

    expect(bindings).toHaveLength(ITEMS);
    expect(bindings.filter(binding => binding.has('label'))).toHaveLength(ITEMS);
    for (const endpoint of [ B, C ]) {
      const selects = federation.queriesTo(endpoint)
        .filter(query => !query.includes('COUNT') && !query.startsWith('ASK') && query.includes('label'));
      // A few requests with blocks of items, instead of one per item, and none for all labels
      expect(selects.length).toBeGreaterThan(0);
      expect(selects.length).toBeLessThan(ITEMS / 10);
      for (const query of selects) {
        expect(query).toMatch(/http:\/\/example\.org\/item\d/u);
      }
    }
  }, 60_000);
});
