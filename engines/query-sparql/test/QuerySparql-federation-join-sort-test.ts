import { QueryEngine } from '../lib/QueryEngine';
import { MockFederation } from './util-federation';

const A = 'http://a.example.org/sparql';
const B = 'http://b.example.org/sparql';
const ITEMS = 2_000;

function names(): string {
  const lines = [ '@prefix ex: <http://example.org/> .' ];
  for (let i = 0; i < ITEMS; i++) {
    lines.push(`ex:item${i} ex:name "Item ${i}" .`);
  }
  return lines.join('\n');
}

/**
 * Regression test for ordering join entries when only a variable that is not joined on can be undefined.
 * Before, such a variable (here ?note, from a UNION) kept the written join order,
 * so the large entry came first, and was fetched in full instead of being bound.
 */
describe('System test: QuerySparql federation with an undefined variable that is not joined on', () => {
  let engine: QueryEngine;
  let federation: MockFederation;

  beforeEach(() => {
    engine = new QueryEngine();
    federation = new MockFederation({
      [A]: `@prefix ex: <http://example.org/> .
        ex:item1 ex:special ex:yes ; ex:note "first" .
        ex:item2 ex:special2 ex:yes .`,
      [B]: names(),
    });
  });

  afterEach(async() => {
    await federation.idle();
  });

  it('starts from the small entry and binds the large one', async() => {
    const bindings = await (await engine.queryBindings(`
      PREFIX ex: <http://example.org/>
      SELECT ?item ?name ?note WHERE {
        ?item ex:name ?name .
        { ?item ex:special ex:yes ; ex:note ?note } UNION { ?item ex:special2 ex:yes }
      }`, { sources: federation.sources, fetch: federation.fetch })).toArray();

    expect(bindings.map(binding => `${binding.get('item')!.value} ${binding.get('name')!.value} ${binding.get('note')?.value}`)
      .sort()).toEqual([
      'http://example.org/item1 Item 1 first',
      'http://example.org/item2 Item 2 undefined',
    ]);
    // The large entry is only requested for the bound items
    const selects = federation.queriesTo(B).filter(query => !query.includes('COUNT') && query.includes('name'));
    expect(selects.length).toBeGreaterThan(0);
    for (const query of selects) {
      expect(query).toMatch(/http:\/\/example\.org\/item\d/u);
    }
  });
});
