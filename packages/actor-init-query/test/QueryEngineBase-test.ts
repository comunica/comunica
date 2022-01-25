import { Readable, Transform } from 'stream';
import { BindingsFactory } from '@comunica/bindings-factory';
import { KeysInitQuery } from '@comunica/context-entries';
import { Bus, ActionContext } from '@comunica/core';
import type { IPhysicalQueryPlanLogger,
  IQueryableResultBindingsEnhanced,
  IQueryableResultQuadsEnhanced,
  IActionContext } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import { translate } from 'sparqlalgebrajs';
import Factory from 'sparqlalgebrajs/lib/factory';
import { QueryEngineBase } from '../lib';
import { ActorInitQuery } from '../lib/ActorInitQuery';
import { ActorInitQueryBase } from '../lib/ActorInitQueryBase';

const DF = new DataFactory();
const BF = new BindingsFactory();

describe('ActorInitQueryBase', () => {
  it('should not allow invoking its run method', () => {
    return expect(new (<any> ActorInitQueryBase)({ bus: new Bus({ name: 'bus' }) }).run()).rejects.toBeTruthy();
  });
});

// eslint-disable-next-line mocha/max-top-level-suites
describe('QueryEngineBase', () => {
  let bus: any;
  let logger: any;
  let mediatorOptimizeQueryOperation: any;
  let mediatorQueryOperation: any;
  let mediatorSparqlParse: any;
  let mediatorSparqlSerialize: any;
  let mediatorHttpInvalidate: any;
  let actorInitQuery: ActorInitQuery;
  let context: IActionContext;

  const contextKeyShortcuts = {
    initialBindings: '@comunica/actor-init-query:initialBindings',
    log: '@comunica/core:log',
    queryFormat: '@comunica/actor-init-query:queryFormat',
    source: '@comunica/bus-rdf-resolve-quad-pattern:source',
    sources: '@comunica/bus-rdf-resolve-quad-pattern:sources',
  };

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    logger = null;
    mediatorOptimizeQueryOperation = {
      mediate: (arg: any) => Promise.resolve(arg),
    };
    mediatorQueryOperation = {};
    mediatorSparqlParse = {};
    mediatorSparqlSerialize = {
      mediate: (arg: any) => Promise.resolve(arg.mediaTypes ?
        { mediaTypes: arg } :
        {
          handle: {
            data: arg.handle.bindingsStream
              .pipe(new Transform({
                objectMode: true,
                transform: (e: any, enc: any, cb: any) => cb(null, JSON.stringify(e)),
              })),
          },
        }),
    };
    mediatorHttpInvalidate = {
      mediate: (arg: any) => Promise.resolve(true),
    };
    context = new ActionContext();
  });

  describe('The QueryEngineBase module', () => {
    it('should be a function', () => {
      expect(QueryEngineBase).toBeInstanceOf(Function);
    });

    it('should be a QueryEngineBase constructor', () => {
      expect(new QueryEngineBase(actorInitQuery)).toBeInstanceOf(QueryEngineBase);
      expect(new QueryEngineBase(actorInitQuery)).toBeInstanceOf(QueryEngineBase);
    });

    it('should not be able to create new QueryEngineBase objects without \'new\'', () => {
      expect(() => { (<any> QueryEngineBase)(); }).toThrow();
    });
  });

  describe('An QueryEngineBase instance', () => {
    const queryString = 'SELECT * WHERE { ?s ?p ?o } LIMIT 100';
    let input: Readable;
    let actor: ActorInitQuery;
    let queryEngine: QueryEngineBase;
    const mediatorContextPreprocess: any = {
      mediate: (action: any) => Promise.resolve(action),
    };

    beforeEach(() => {
      jest.resetAllMocks();
      input = new Readable({ objectMode: true });
      input._read = () => {
        const triple = { a: 'triple' };
        input.push(triple);
        input.push(null);
      };
      const factory = new Factory();
      mediatorQueryOperation.mediate = jest.fn((action: any) => {
        if (action.context.has(KeysInitQuery.physicalQueryPlanLogger)) {
          (<IPhysicalQueryPlanLogger> action.context.get(KeysInitQuery.physicalQueryPlanLogger))
            .logOperation(
              'logicalOp',
              'physicalOp',
              {},
              undefined,
              'actor',
              {},
            );
        }
        return action.operation !== 'INVALID' ?
          Promise.resolve({ type: 'bindings', bindingsStream: input }) :
          Promise.reject(new Error('Invalid query'));
      });
      mediatorSparqlParse.mediate = (action: any) => action.query === 'INVALID' ?
        Promise.resolve({ operation: action.query }) :
        Promise.resolve({
          baseIRI: action.query.includes('BASE') ? 'myBaseIRI' : null,
          operation: factory.createProject(
            factory.createBgp([
              factory.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')),
            ]),
            [
              DF.variable('s'),
              DF.variable('p'),
              DF.variable('o'),
            ],
          ),
        });
      const defaultQueryInputFormat = 'sparql';
      actor = new ActorInitQuery(
        { bus,
          contextKeyShortcuts,
          defaultQueryInputFormat,
          logger,
          mediatorContextPreprocess,
          mediatorHttpInvalidate,
          mediatorOptimizeQueryOperation,
          mediatorQueryOperation,
          mediatorSparqlParse,
          mediatorSparqlSerialize,
          mediatorSparqlSerializeMediaTypeCombiner: mediatorSparqlSerialize,
          mediatorSparqlSerializeMediaTypeFormatCombiner: mediatorSparqlSerialize,
          name: 'actor' },
      );
      queryEngine = new QueryEngineBase(actor);
    });

    describe('invalidateHttpCache', () => {
      it('should call the HTTP invalidate mediator', async() => {
        jest.spyOn(mediatorHttpInvalidate, 'mediate');
        await queryEngine.invalidateHttpCache('a');
        expect(mediatorHttpInvalidate.mediate).toHaveBeenCalledWith({ context, url: 'a' });
      });
    });

    describe('query', () => {
      it('should apply bindings when initialBindings are passed via the context', () => {
        const ctx = { '@comunica/actor-init-query:initialBindings': BF.bindings({ '?s': DF.literal('sl') }) };
        return expect(queryEngine.query('SELECT * WHERE { ?s ?p ?o }', ctx))
          .resolves.toBeTruthy();
      });

      it('should apply bindings when initialBindings in the old format are passed via the context', () => {
        const ctx = { initialBindings: BF.bindings({ '?s': DF.literal('sl') }) };
        return expect(queryEngine.query('SELECT * WHERE { ?s ?p ?o }', ctx))
          .resolves.toBeTruthy();
      });

      it('should apply bindings when sources in the old format are passed via the context', () => {
        const ctx = { sources: []};
        return expect(queryEngine.query('SELECT * WHERE { ?s ?p ?o }', ctx))
          .resolves.toBeTruthy();
      });

      it('should allow query to be called without context', () => {
        return expect(queryEngine.query('SELECT * WHERE { ?s ?p ?o }'))
          .resolves.toBeTruthy();
      });

      it('should allow KeysInitSparql.queryTimestamp to be set', () => {
        const ctx = { [KeysInitQuery.queryTimestamp.name]: new Date() };
        return expect(queryEngine.query('SELECT * WHERE { ?s ?p ?o }', ctx))
          .resolves.toBeTruthy();
      });

      it('should allow a parsed query to be passd', () => {
        return expect(queryEngine.query(translate('SELECT * WHERE { ?s ?p ?o }')))
          .resolves.toBeTruthy();
      });

      it('should not modify the baseIRI without BASE in query', async() => {
        expect((<any> (await queryEngine.query('SELECT * WHERE { ?s ?p ?o }')).context)
          .toJS()['@comunica/actor-init-query:baseIRI']).toBeFalsy();
      });

      it('should allow a query to modify the context\'s baseIRI', async() => {
        expect((<any> (await queryEngine.query('BASE <http://example.org/book/> SELECT * WHERE { ?s ?p ?o }')).context)
          .toJS())
          .toMatchObject({
            '@comunica/actor-init-query:baseIRI': 'myBaseIRI',
          });
      });

      it('should pass down the provided context if optimize actors do not return one', async() => {
        mediatorOptimizeQueryOperation.mediate = (action: any) => {
          return Promise.resolve({ ...action, context: undefined });
        };
        const result = await queryEngine.query('SELECT * WHERE { ?s ?p ?o }', { 'the-answer': 42 });
        expect(result).toHaveProperty('context');
        expect((<ActionContext> result.context).getRaw('the-answer')).toEqual(42);
      });

      it('should allow optimize actors to modify the context', async() => {
        mediatorOptimizeQueryOperation.mediate = (action: any) => {
          return Promise.resolve({
            ...action,
            context: action.context.setRaw('the-answer', 42),
          });
        };
        const result = await queryEngine.query('SELECT * WHERE { ?s ?p ?o }');
        expect(result).toHaveProperty('context');
        expect((<ActionContext> result.context).getRaw('the-answer')).toEqual(42);
      });

      it('bindings() should collect all bindings until "end" event occurs on triples', async() => {
        const ctx = { sources: []};
        const result = await queryEngine.query('SELECT * WHERE { ?s ?p ?o }', ctx);
        const array = await (<IQueryableResultBindingsEnhanced> result).bindings();
        expect(array).toEqual([{ a: 'triple' }]);
      });

      it('bindings() should return empty list if no solutions', async() => {
        const ctx = { sources: []};
        // Set input empty
        const inputThis = new Readable({ objectMode: true });
        inputThis._read = () => {
          inputThis.push(null);
        };
        mediatorQueryOperation.mediate = (action: any) => action.operation.query !== 'INVALID' ?
          Promise.resolve({ bindingsStream: inputThis, type: 'bindings' }) :
          Promise.reject(new Error('a'));
        const result = await queryEngine.query('SELECT * WHERE { ?s ?p ?o }', ctx);
        const array = await (<IQueryableResultBindingsEnhanced> result).bindings();
        expect(array).toEqual([]);
      });

      it('should return a rejected promise on an invalid request', () => {
        const ctx = { sources: []};
        // Make it reject instead of reading input
        mediatorQueryOperation.mediate = (action: any) => Promise.reject(new Error('a'));
        return expect(queryEngine.query('INVALID QUERY', ctx)).rejects.toBeTruthy();
      });

      it('should return a rejected promise on an explain', () => {
        const ctx = { sources: [], [KeysInitQuery.explain.name]: 'parsed' };
        return expect(queryEngine.query('BLA', ctx)).rejects
          .toThrowError('Tried to explain a query when in query-only mode');
      });
    });

    describe('getResultMediaTypeFormats', () => {
      it('should return the media type formats', () => {
        const med: any = {
          mediate: (arg: any) => Promise.resolve({ mediaTypeFormats: { data: 'DATA' }}),
        };
        actor = new ActorInitQuery(
          { bus,
            contextKeyShortcuts,
            logger,
            mediatorContextPreprocess,
            mediatorHttpInvalidate,
            mediatorOptimizeQueryOperation,
            mediatorQueryOperation,
            mediatorSparqlParse,
            mediatorSparqlSerialize: med,
            mediatorSparqlSerializeMediaTypeCombiner: med,
            mediatorSparqlSerializeMediaTypeFormatCombiner: med,
            name: 'actor',
            queryString },
        );
        queryEngine = new QueryEngineBase(actor);
        return expect(queryEngine.getResultMediaTypeFormats())
          .resolves.toEqual({ data: 'DATA' });
      });
    });
  });

  describe('An QueryEngineBase instance for quads', () => {
    let actor: ActorInitQuery;
    let queryEngine: QueryEngineBase;
    const mediatorContextPreprocess: any = {
      mediate: (action: any) => Promise.resolve(action),
    };

    beforeEach(() => {
      const input = new Readable({ objectMode: true });
      input._read = () => {
        input.push(DF.quad(
          DF.namedNode('http://dbpedia.org/resource/Renault_Dauphine'),
          DF.namedNode('http://dbpedia.org/ontology/assembly'),
          DF.namedNode('http://dbpedia.org/resource/Belgium'),
          DF.defaultGraph(),
        ));
        input.push(null);
      };
      const factory = new Factory();
      mediatorQueryOperation.mediate = (action: any) => action.operation.query !== 'INVALID' ?
        Promise.resolve({ quadStream: input, type: 'quads' }) :
        Promise.reject(new Error('a'));
      mediatorSparqlParse.mediate = (action: any) => action.query === 'INVALID' ?
        Promise.resolve(action.query) :
        Promise.resolve({
          baseIRI: action.query.includes('BASE') ? 'myBaseIRI' : null,
          operation: factory.createProject(
            factory.createBgp([
              factory.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')),
            ]),
            [
              DF.variable('s'),
              DF.variable('p'),
              DF.variable('o'),
            ],
          ),
        });
      const defaultQueryInputFormat = 'sparql';
      actor = new ActorInitQuery(
        { bus,
          contextKeyShortcuts,
          defaultQueryInputFormat,
          logger,
          mediatorContextPreprocess,
          mediatorHttpInvalidate,
          mediatorOptimizeQueryOperation,
          mediatorQueryOperation,
          mediatorSparqlParse,
          mediatorSparqlSerialize,
          mediatorSparqlSerializeMediaTypeCombiner: mediatorSparqlSerialize,
          mediatorSparqlSerializeMediaTypeFormatCombiner: mediatorSparqlSerialize,
          name: 'actor' },
      );
      queryEngine = new QueryEngineBase(actor);
    });

    it('quads() should collect all quads until "end" event occurs', async() => {
      const ctx = { sources: []};
      const result = await queryEngine.query('CONSTRUCT WHERE { ?s ?p ?o }', ctx);
      const array = await (<IQueryableResultQuadsEnhanced> result).quads();
      expect(array).toEqual([ DF.quad(
        DF.namedNode('http://dbpedia.org/resource/Renault_Dauphine'),
        DF.namedNode('http://dbpedia.org/ontology/assembly'),
        DF.namedNode('http://dbpedia.org/resource/Belgium'),
        DF.defaultGraph(),
      ) ]);
    });

    it('quads() should return empty list if no solutions', async() => {
      const ctx = { sources: []};
      // Set input empty
      const input = new Readable({ objectMode: true });
      input._read = () => {
        input.push(null);
      };
      mediatorQueryOperation.mediate = (action: any) => action.operation.query !== 'INVALID' ?
        Promise.resolve({ quadStream: input, type: 'quads' }) :
        Promise.reject(new Error('a'));
      const result = await queryEngine.query('CONSTRUCT * WHERE { ?s ?p ?o }', ctx);
      const array = await (<IQueryableResultQuadsEnhanced> result).quads();
      expect(array).toEqual([]);
    });

    it('should return a rejected promise on an invalid request', () => {
      const ctx = { sources: []};
      // Make it reject instead of reading input
      mediatorQueryOperation.mediate = (action: any) => Promise.reject(new Error('a'));
      return expect(queryEngine.query('INVALID QUERY', ctx)).rejects.toBeTruthy();
    });
  });
});
