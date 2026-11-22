import { QueryEngine } from '../lib/QueryEngine';
import { MockFederation } from './util-federation';

const A = 'http://a.example.org/sparql';
const B = 'http://b.example.org/sparql';
const C = 'http://c.example.org/sparql';
const OTHERS = 2_000;

/**
 * Roles of items for persons, with blank nodes or IRIs as roles, and many other roles.
 */
function roles(blankNodes: boolean, offset: number): string {
  const lines = [ '@prefix ex: <http://example.org/> .' ];
  for (let i = offset; i < offset + 3; i++) {
    const role = blankNodes ? `_:role${i}` : `ex:role${i}`;
    lines.push(`${role} ex:person ex:person1 .`, `ex:item${i} ex:role ${role} .`);
  }
  for (let i = 0; i < OTHERS; i++) {
    const role = blankNodes ? `_:other${i}` : `ex:other${offset}-${i}`;
    lines.push(`${role} ex:person ex:other${i} .`, `ex:otherItem${offset}-${i} ex:role ${role} .`);
  }
  return lines.join('\n');
}

/**
 * Regression test for joins over blank nodes in federations.
 * Blank nodes can not be passed to a source, so bind joins skipped bindings with blank nodes for a join variable,
 * and lost the results of joins over blank nodes within a source.
 */
describe('System test: QuerySparql federation with joins over blank nodes', () => {
  let engine: QueryEngine;
  let federation: MockFederation;

  beforeEach(() => {
    engine = new QueryEngine();
    federation = new MockFederation({
      [A]: `@prefix ex: <http://example.org/> . ex:person1 ex:name "Person 1" .`,
      [B]: roles(true, 0),
      [C]: roles(false, 10),
    });
  });

  afterEach(async() => {
    await federation.idle();
  });

  it('finds the results of joins over blank nodes within a source', async() => {
    const bindings = await (await engine.queryBindings(`
      PREFIX ex: <http://example.org/>
      SELECT ?item WHERE {
        ?person ex:name "Person 1" .
        ?role ex:person ?person .
        ?item ex:role ?role .
      }`, { sources: federation.sources, fetch: federation.fetch })).toArray();

    expect(bindings.map(binding => binding.get('item')!.value).sort()).toEqual([
      'http://example.org/item0',
      'http://example.org/item1',
      'http://example.org/item10',
      'http://example.org/item11',
      'http://example.org/item12',
      'http://example.org/item2',
    ]);
    // Queries with blank nodes in them would match anything
    for (const query of [ ...federation.queriesTo(B), ...federation.queriesTo(C) ]) {
      expect(query).not.toMatch(/_:/u);
    }
  }, 60_000);
});
