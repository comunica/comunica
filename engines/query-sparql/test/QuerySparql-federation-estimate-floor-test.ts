import { QueryEngine } from '../lib/QueryEngine';
import { MockFederation } from './util-federation';

const A = 'http://a.example.org/sparql';
const B = 'http://b.example.org/sparql';
const C = 'http://c.example.org/sparql';

/**
 * Collect the estimated cardinalities of all join nodes of a physical plan.
 */
function joinCardinalities(node: any, values: number[] = []): number[] {
  if (typeof node.logical === 'string' && node.logical.startsWith('join') && node.cardinality) {
    values.push(node.cardinality.value);
  }
  for (const child of node.children ?? []) {
    joinCardinalities(child, values);
  }
  return values;
}

/**
 * Regression test for join estimates far below one result.
 * Each join multiplied its estimate down further, so the cost of joining with other entries vanished,
 * which let a nested-loop join over large entries look free in a federated query over 35 endpoints.
 */
describe('System test: QuerySparql federation with joins of small entries', () => {
  let engine: QueryEngine;
  let federation: MockFederation;
  const query = `PREFIX ex: <http://example.org/>
    SELECT * WHERE { ?c ex:label "portraits" . ?c ex:match ?a . ?a ex:kind ?k }`;

  beforeEach(() => {
    engine = new QueryEngine();
    federation = new MockFederation({
      [A]: `@prefix ex: <http://example.org/> . ex:c ex:label "portraits" . ex:c2 ex:label "other" .`,
      [B]: `@prefix ex: <http://example.org/> . ex:c ex:match ex:a1 . ex:c2 ex:match ex:a2 .`,
      [C]: `@prefix ex: <http://example.org/> . ex:a1 ex:kind ex:k1 .`,
    });
  });

  afterEach(async() => {
    await federation.idle();
  });

  it('estimates at least one result for joins of non-empty entries', async() => {
    const bindings = await (await engine.queryBindings(query, {
      sources: federation.sources,
      fetch: federation.fetch,
    })).toArray();
    expect(bindings).toHaveLength(1);

    const plan = await engine.explain(query, { sources: federation.sources, fetch: federation.fetch }, 'physical-json');
    const cardinalities = joinCardinalities(plan.data);
    expect(cardinalities.length).toBeGreaterThan(0);
    for (const cardinality of cardinalities) {
      expect(cardinality).toBeGreaterThanOrEqual(1);
    }
  });
});
