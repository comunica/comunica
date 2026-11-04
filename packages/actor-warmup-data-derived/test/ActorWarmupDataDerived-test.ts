import { Readable } from 'node:stream';
import type { IActionWarmup } from '@comunica/bus-warmup';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { ActorWarmupDataDerived } from '../lib/ActorWarmupDataDerived';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

function engineFor(responses: Record<string, RDF.Bindings[]>, data = (): Readable => Readable.from([ 'x' ])): any {
  return {
    queryBindings: jest.fn(async(query: string) => ({ toArray: async() => responses[query] ?? []})),
    query: jest.fn(async() => 'RESULT'),
    resultToString: jest.fn(async() => ({ data: data() })),
  };
}

describe('ActorWarmupDataDerived', () => {
  let bus: any;
  let actor: ActorWarmupDataDerived;
  const context = new ActionContext({ sources: [ 'SOURCE' ]});
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

  function action(engine: any, options: Partial<IActionWarmup> = {}): IActionWarmup {
    return { engine, context, ...options };
  }

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    actor = new ActorWarmupDataDerived({ name: 'actor', bus, executions: 10 });
  });

  describe('test', () => {
    it('should pass', async() => {
      await expect(actor.test(action(engineFor(responses)))).resolves.toPassTestVoid();
    });

    it('should pass for sources in memory or in files', async() => {
      const sources = [
        'data.ttl',
        '/data/data.ttl',
        'file:///data/data.ttl',
        'C:\\data\\data.ttl',
        { match: () => null },
        { type: 'rdfjs', value: { match: () => null }},
        { type: 'file', value: 'http://example.org/data.ttl' },
        { type: 'serialized', value: '<ex:s> <ex:p> <ex:o>.' },
        { type: 'compositefile', value: [ 'a.ttl', 'b.ttl' ]},
        { value: 'data.ttl' },
        { value: { match: () => null }},
      ];
      await expect(actor.test(action(engineFor(responses), { context: new ActionContext({ sources }) }))).resolves
        .toPassTestVoid();
    });

    it('should read sources from their full context key', async() => {
      const fullContext = new ActionContext({ [KeysInitQuery.querySourcesUnidentified.name]: [ 'data.ttl' ]});
      await expect(actor.test(action(engineFor(responses), { context: fullContext }))).resolves.toPassTestVoid();
    });

    it('should fail for sources that may be remote', async() => {
      const message = 'actor only warms up over sources in memory or in files, so not over';
      for (const [ source, label ] of <[any, string][]> [
        [ 'http://example.org/sparql', 'http://example.org/sparql' ],
        [{ value: 'https://example.org/data' }, 'https://example.org/data' ],
        [{ type: 'sparql', value: 'http://example.org/sparql' }, 'a source of type sparql' ],
        [{ type: 'traverse', value: []}, 'a source of type traverse' ],
      ]) {
        const sourcesContext = new ActionContext({ sources: [ 'data.ttl', source ]});
        await expect(actor.test(action(engineFor(responses), { context: sourcesContext }))).resolves
          .toFailTest(`${message} ${label}`);
      }
    });

    it('should fail without sources', async() => {
      await expect(actor.test(action(engineFor(responses), { context: new ActionContext() }))).resolves
        .toFailTest('actor requires sources to warm up over');
    });
  });

  describe('generateQueries', () => {
    it('should derive patterns, stars, and paths from the data', async() => {
      await expect(ActorWarmupDataDerived.generateQueries(engineFor(responses), context)).resolves.toEqual([
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
      await ActorWarmupDataDerived.generateQueries(engine, context);
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
      await expect(ActorWarmupDataDerived.generateQueries(engine, context)).resolves.toEqual([
        'SELECT ?s WHERE { ?s <ex:p1> <ex:o1> } LIMIT 20',
        'SELECT ?s WHERE { ?s <ex:p1> ?o } LIMIT 20',
      ]);
    });

    it('should generate no queries without data', async() => {
      await expect(ActorWarmupDataDerived.generateQueries(engineFor({}), context)).resolves.toEqual([]);
    });

    it('should stop sampling the data once stopped', async() => {
      const engine = engineFor(responses);
      let stopped = false;
      const queryBindings = engine.queryBindings.getMockImplementation();
      engine.queryBindings.mockImplementation(async(query: string) => {
        stopped = true;
        return queryBindings(query);
      });
      await expect(ActorWarmupDataDerived.generateQueries(engine, context, () => stopped)).resolves.toEqual([]);
      expect(engine.queryBindings).toHaveBeenCalledTimes(1);
    });

    it('should report when the first query has loaded the sources', async() => {
      const engine = engineFor(responses);
      const loaded = jest.fn(() => expect(engine.queryBindings).toHaveBeenCalledTimes(1));
      await ActorWarmupDataDerived.generateQueries(engine, context, undefined, loaded);
      expect(loaded).toHaveBeenCalledTimes(1);
    });
  });

  describe('run', () => {
    it('should execute the queries in turn, and serialize their results', async() => {
      const engine = engineFor(responses);
      await expect(actor.run(action(engine))).resolves.toEqual({ executions: 10 });
      expect(engine.query).toHaveBeenCalledTimes(10);
      expect(engine.query).toHaveBeenNthCalledWith(1, 'SELECT ?s WHERE { ?s <ex:p1> <ex:o1> } LIMIT 20', context);
      expect(engine.query).toHaveBeenNthCalledWith(8, 'SELECT ?s WHERE { ?s <ex:p1> <ex:o1> } LIMIT 20', context);
      expect(engine.resultToString).toHaveBeenCalledWith('RESULT', 'application/sparql-results+json');
    });

    it('should take the number of executions from the action', async() => {
      const engine = engineFor(responses);
      await expect(actor.run(action(engine, { executions: 3 }))).resolves.toEqual({ executions: 3 });
      expect(engine.query).toHaveBeenCalledTimes(3);
    });

    it('should not start executions after the time budget', async() => {
      const engine = engineFor(responses);
      await expect(actor.run(action(engine, { budget: 0 }))).resolves.toEqual({ executions: 0 });
      expect(engine.query).not.toHaveBeenCalled();
    });

    it('should not count loading the sources towards the time budget', async() => {
      const engine = engineFor(responses);
      const queryBindings = engine.queryBindings.getMockImplementation();
      engine.queryBindings.mockImplementationOnce(async(query: string) => {
        await new Promise(resolve => setTimeout(resolve, 150));
        return queryBindings(query);
      });
      await expect(actor.run(action(engine, { budget: 100 }))).resolves.toEqual({ executions: 10 });
    });

    it('should stop sampling the data once the time budget has passed', async() => {
      const engine = engineFor(responses);
      let now = 0;
      const dateNow = jest.spyOn(Date, 'now').mockImplementation(() => now);
      const queryBindings = engine.queryBindings.getMockImplementation();
      engine.queryBindings.mockImplementation(async(query: string) => {
        if (engine.queryBindings.mock.calls.length === 2) {
          now = 1000;
        }
        return queryBindings(query);
      });
      await expect(actor.run(action(engine, { budget: 100 }))).resolves.toEqual({ executions: 0 });
      expect(engine.queryBindings).toHaveBeenCalledTimes(2);
      dateNow.mockRestore();
    });

    it('should not sample or execute anything if the signal is aborted beforehand', async() => {
      const engine = engineFor(responses);
      await expect(actor.run(action(engine, { signal: AbortSignal.abort() }))).resolves.toEqual({ executions: 0 });
      expect(engine.queryBindings).not.toHaveBeenCalled();
      expect(engine.query).not.toHaveBeenCalled();
    });

    it('should not start executions once the signal is aborted', async() => {
      const engine = engineFor(responses);
      const controller = new AbortController();
      engine.query.mockImplementation(async() => {
        if (engine.query.mock.calls.length === 3) {
          controller.abort();
        }
        return 'RESULT';
      });
      await expect(actor.run(action(engine, { signal: controller.signal }))).resolves.toEqual({ executions: 3 });
      expect(engine.query).toHaveBeenCalledTimes(3);
    });

    it('should not execute anything without data', async() => {
      const engine = engineFor({});
      await expect(actor.run(action(engine))).resolves.toEqual({ executions: 0 });
      expect(engine.query).not.toHaveBeenCalled();
    });

    it('should reject on serialization errors', async() => {
      const engine = engineFor(responses, () => new Readable({
        read() {
          this.destroy(new Error('serialization error'));
        },
      }));
      await expect(actor.run(action(engine))).rejects.toThrow('serialization error');
    });
  });
});
