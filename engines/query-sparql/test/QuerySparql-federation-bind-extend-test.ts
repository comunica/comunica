import { QueryEngine } from '../lib/QueryEngine';
import { MockFederation } from './util-federation';

const A = 'http://a.example.org/sparql';
const B = 'http://b.example.org/sparql';
const C = 'http://c.example.org/sparql';
const ITEMS = 2_000;

function data(predicate: string, prefix: string): string {
  const lines = [ '@prefix ex: <http://example.org/> .' ];
  for (let i = 0; i < ITEMS; i++) {
    lines.push(`ex:o${i} ex:${predicate} "${prefix}${i}" .`);
  }
  return lines.join('\n');
}

/**
 * Regression test for binding into UNIONs over multiple sources whose branches contain BIND.
 * Before, any BIND made the union unbindable, so each branch was fetched in full from its source.
 */
describe('System test: QuerySparql federation with BIND in a UNION over multiple sources', () => {
  let engine: QueryEngine;
  let federation: MockFederation;

  beforeEach(() => {
    engine = new QueryEngine();
    federation = new MockFederation({
      [A]: `@prefix ex: <http://example.org/> . ex:s0 ex:p ex:o0 . ex:s1 ex:p ex:o1 . ex:s2 ex:p ex:o2 .`,
      [B]: data('q', 'v'),
      [C]: data('r', 'w'),
    });
  });

  it('binds the left bindings into the union instead of fetching its branches in full', async() => {
    const bindings = await (await engine.queryBindings(`
      PREFIX ex: <http://example.org/>
      SELECT ?s ?k ?v WHERE {
        ?s ex:p ?o .
        { ?o ex:q ?v . BIND("q" AS ?k) } UNION { ?o ex:r ?v . BIND("r" AS ?k) }
      }`, { sources: federation.sources, fetch: federation.fetch })).toArray();

    expect(bindings.map(binding => `${binding.get('s')!.value} ${binding.get('k')!.value} ${binding.get('v')!.value}`)
      .sort()).toEqual([
      'http://example.org/s0 q v0',
      'http://example.org/s0 r w0',
      'http://example.org/s1 q v1',
      'http://example.org/s1 r w1',
      'http://example.org/s2 q v2',
      'http://example.org/s2 r w2',
    ]);
    // Only the bound branches are requested: no SELECT over a branch without the values of ?o
    for (const endpoint of [ B, C ]) {
      const selects = federation.queriesTo(endpoint).filter(query => !query.includes('COUNT'));
      expect(selects.length).toBeGreaterThan(0);
      for (const query of selects) {
        expect(query).toMatch(/http:\/\/example\.org\/o\d/u);
      }
    }
  });
});
