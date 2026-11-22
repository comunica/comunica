import { join } from 'node:path';
import { QueryEngineFactory } from '../lib/QueryEngineFactory';
import { MockFederation } from './util-federation';

const A = 'http://a.example.org/sparql';
const B = 'http://b.example.org/sparql';

/**
 * Determine the variables of each EXISTS expression in a query.
 */
function existsVariables(query: string): Set<string>[] {
  const sets: Set<string>[] = [];
  for (const [ , body ] of query.matchAll(/EXISTS\s*\{([^{}]*)\}/gu)) {
    sets.push(new Set([ ...body.matchAll(/\?(\w+)/gu) ].map(match => match[1])));
  }
  return sets;
}

/**
 * Regression test for ASK queries that are batched into a single SELECT query with an EXISTS per ASK query.
 * Some endpoints, such as the one of Beeld en Geluid, correlate equally named variables of different EXISTS
 * expressions, so a batched ASK query answered false for a pattern with results, and its source was pruned.
 */
describe('System test: QuerySparql federation with batched ASK queries', () => {
  let federation: MockFederation;

  beforeEach(() => {
    federation = new MockFederation({
      [A]: `@prefix ex: <http://example.org/> . ex:s1 ex:creator ex:o1 . ex:s1 ex:name "one" .`,
      [B]: `@prefix ex: <http://example.org/> . ex:s2 ex:creator ex:o2 . ex:s2 ex:name "two" .`,
    });
  });

  afterEach(async() => {
    await federation.idle();
  });

  it('uses different variables for each ASK query of a batch', async() => {
    const engine = await new QueryEngineFactory()
      .create({ configPath: join(__dirname, 'assets', 'config-ask-batching.json') });
    const bindings = await (await engine.queryBindings(`
      PREFIX ex: <http://example.org/>
      SELECT ?s ?name WHERE { ?s ex:creator ?o . ?s ex:name ?name }`, {
      sources: federation.sources,
      fetch: federation.fetch,
    })).toArray();

    expect(bindings.map(binding => `${binding.get('s')!.value} ${binding.get('name')!.value}`).sort()).toEqual([
      'http://example.org/s1 one',
      'http://example.org/s2 two',
    ]);
    const batches = federation.requests
      .filter(request => request.query && /^\s*SELECT\s*\(\s*EXISTS/u.test(request.query));
    expect(batches.length).toBeGreaterThan(0);
    for (const { query } of batches) {
      const variables = existsVariables(query!);
      expect(variables.length).toBeGreaterThan(1);
      const all = variables.flatMap(set => [ ...set ]);
      expect(new Set(all).size).toBe(all.length);
    }
  });
});
