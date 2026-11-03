import { Readable } from 'node:stream';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { EndpointWarmup } from '../lib/EndpointWarmup';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

function engineFor(responses: Record<string, RDF.Bindings[]>, data = (): Readable => Readable.from([ 'x' ])): any {
  return {
    queryBindings: jest.fn(async(query: string) => ({ toArray: async() => responses[query] ?? []})),
    query: jest.fn(async() => 'RESULT'),
    resultToString: jest.fn(async() => ({ data: data() })),
  };
}

describe('EndpointWarmup', () => {
  const context: any = { sources: [ 'SOURCE' ]};
  const responses: Record<string, RDF.Bindings[]> = {
    'SELECT DISTINCT ?p WHERE { ?s ?p ?o } LIMIT 64': [
      BF.fromRecord({ p: DF.namedNode('ex:p1') }),
      BF.fromRecord({ p: DF.blankNode('notAnIri') }),
      BF.fromRecord({ p: DF.namedNode('ex:p2') }),
    ],
    'SELECT ?s ?o WHERE { ?s <ex:p1> ?o } LIMIT 2': [
      BF.fromRecord({ s: DF.namedNode('ex:s1'), o: DF.namedNode('ex:o1') }),
      BF.fromRecord({ s: DF.blankNode('b1'), o: DF.literal('lit') }),
    ],
    'SELECT ?p ?o WHERE { <ex:s1> ?p ?o } LIMIT 16': [
      BF.fromRecord({ p: DF.namedNode('ex:p1'), o: DF.namedNode('ex:o1') }),
      BF.fromRecord({ p: DF.namedNode('ex:p2'), o: DF.literal('lit') }),
    ],
    'SELECT ?p WHERE { <ex:o1> ?p ?x } LIMIT 1': [
      BF.fromRecord({ p: DF.namedNode('ex:p3') }),
    ],
  };

  describe('generateQueries', () => {
    it('should derive patterns, stars, and paths from the data', async() => {
      await expect(new EndpointWarmup(engineFor(responses), context).generateQueries()).resolves.toEqual([
        'SELECT ?s WHERE { ?s <ex:p1> <ex:o1> } LIMIT 20',
        'SELECT ?s WHERE { ?s <ex:p1> ?o } LIMIT 20',
        'SELECT * WHERE { ?s <ex:p1> ?a . ?s <ex:p2> ?b } LIMIT 20',
        'SELECT ?s ?b WHERE { ?s <ex:p1> ?a . ?s <ex:p2> ?b . ?s ?p ?c } LIMIT 20',
        'SELECT * WHERE { ?a <ex:p1> ?b . ?b <ex:p3> ?c } LIMIT 20',
        'SELECT ?b ?c WHERE { <ex:s1> <ex:p1> ?b . ?b <ex:p3> ?c . ?c ?q ?d } LIMIT 20',
        'SELECT ?a ?c WHERE { ?a <ex:p1> ?b . ?b <ex:p3> ?c . ?a <ex:p1> ?e } LIMIT 20',
      ]);
    });

    it('should query the sources in the given context', async() => {
      const engine = engineFor(responses);
      await new EndpointWarmup(engine, context).generateQueries();
      expect(engine.queryBindings).toHaveBeenCalledWith('SELECT DISTINCT ?p WHERE { ?s ?p ?o } LIMIT 64', context);
    });

    it('should not derive stars or paths if subjects have one predicate and no linked subjects', async() => {
      const engine = engineFor({
        ...responses,
        'SELECT ?p ?o WHERE { <ex:s1> ?p ?o } LIMIT 16': [
          BF.fromRecord({ p: DF.namedNode('ex:p1'), o: DF.namedNode('ex:o1') }),
        ],
        'SELECT ?p WHERE { <ex:o1> ?p ?x } LIMIT 1': [],
      });
      await expect(new EndpointWarmup(engine, context).generateQueries()).resolves.toEqual([
        'SELECT ?s WHERE { ?s <ex:p1> <ex:o1> } LIMIT 20',
        'SELECT ?s WHERE { ?s <ex:p1> ?o } LIMIT 20',
      ]);
    });

    it('should generate no queries without data', async() => {
      await expect(new EndpointWarmup(engineFor({}), context).generateQueries()).resolves.toEqual([]);
    });
  });

  describe('run', () => {
    it('should execute the queries in turn, and serialize their results', async() => {
      const engine = engineFor(responses);
      await expect(new EndpointWarmup(engine, context).run(10, 60_000))
        .resolves.toEqual({ queries: 7, executions: 10 });
      expect(engine.query).toHaveBeenCalledTimes(10);
      expect(engine.query).toHaveBeenNthCalledWith(1, 'SELECT ?s WHERE { ?s <ex:p1> <ex:o1> } LIMIT 20', context);
      expect(engine.query).toHaveBeenNthCalledWith(8, 'SELECT ?s WHERE { ?s <ex:p1> <ex:o1> } LIMIT 20', context);
      expect(engine.resultToString).toHaveBeenCalledWith('RESULT', 'application/sparql-results+json');
    });

    it('should not start executions after the time budget', async() => {
      const engine = engineFor(responses);
      await expect(new EndpointWarmup(engine, context).run(10, 0)).resolves.toEqual({ queries: 7, executions: 0 });
      expect(engine.query).not.toHaveBeenCalled();
    });

    it('should not count generating the queries towards the time budget', async() => {
      const engine = engineFor(responses);
      const queryBindings = engine.queryBindings.getMockImplementation();
      engine.queryBindings.mockImplementation(async(query: string) => {
        await new Promise(resolve => setTimeout(resolve, 30));
        return queryBindings(query);
      });
      await expect(new EndpointWarmup(engine, context).run(10, 100)).resolves.toEqual({ queries: 7, executions: 10 });
    });

    it('should not execute anything without data', async() => {
      const engine = engineFor({});
      await expect(new EndpointWarmup(engine, context).run(10, 60_000)).resolves.toEqual({ queries: 0, executions: 0 });
      expect(engine.query).not.toHaveBeenCalled();
    });

    it('should reject on serialization errors', async() => {
      const engine = engineFor(responses, () => new Readable({
        read() {
          this.destroy(new Error('serialization error'));
        },
      }));
      await expect(new EndpointWarmup(engine, context).run(10, 60_000)).rejects.toThrow('serialization error');
    });
  });
});
