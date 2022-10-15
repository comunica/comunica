import { Readable, Transform } from 'stream';
import { BindingsFactory } from '@comunica/bindings-factory';
import { KeysInitQuery } from '@comunica/context-entries';
import { Bus, ActionContext, ActionContextKey } from '@comunica/core';
import type {
  IPhysicalQueryPlanLogger,
  IActionContext, QueryStringContext, IQueryBindingsEnhanced, IQueryQuadsEnhanced,
  QueryType, IQueryOperationResultQuads, IQueryOperationResultBindings,
  IQueryOperationResultBoolean, IQueryOperationResultVoid, IQueryEngine, IQueryContextCommon,
} from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { translate } from 'sparqlalgebrajs';
import Factory from 'sparqlalgebrajs/lib/factory';
import { QueryEngineBase } from '../lib';
import { ActorInitQuery } from '../lib/ActorInitQuery';
import type { IActorInitQueryBaseArgs } from '../lib/ActorInitQueryBase';
import { ActorInitQueryBase } from '../lib/ActorInitQueryBase';
import '@comunica/jest';
import 'jest-rdf';

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
  let mediatorContextPreprocess: any;
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
    mediatorContextPreprocess = {
      mediate: (action: any) => Promise.resolve(action),
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
    let input: any;
    let actor: ActorInitQuery;
    let queryEngine: IQueryEngine;

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
          mediatorQueryParse: mediatorSparqlParse,
          mediatorQueryResultSerialize: mediatorSparqlSerialize,
          mediatorQueryResultSerializeMediaTypeCombiner: mediatorSparqlSerialize,
          mediatorQueryResultSerializeMediaTypeFormatCombiner: mediatorSparqlSerialize,
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
        const ctx: QueryStringContext = {
          sources: [ 'dummy' ],
          '@comunica/actor-init-query:initialBindings': BF.bindings([
            [ DF.variable('s'), DF.literal('sl') ],
          ]),
        };
        return expect(queryEngine.query('SELECT * WHERE { ?s ?p ?o }', ctx))
          .resolves.toBeTruthy();
      });

      it('should apply bindings when initialBindings in the old format are passed via the context', () => {
        const ctx: QueryStringContext = {
          sources: [ 'dummy' ],
          initialBindings: BF.bindings([
            [ DF.variable('s'), DF.literal('sl') ],
          ]),
        };
        return expect(queryEngine.query('SELECT * WHERE { ?s ?p ?o }', ctx))
          .resolves.toBeTruthy();
      });

      it('should apply bindings when sources in the old format are passed via the context', () => {
        return expect(queryEngine.query('SELECT * WHERE { ?s ?p ?o }', { sources: [ 'abc' ]}))
          .resolves.toBeTruthy();
      });

      it('should allow query to be called without context', () => {
        return expect(queryEngine.query('SELECT * WHERE { ?s ?p ?o }'))
          .resolves.toBeTruthy();
      });

      it('should allow KeysInitSparql.queryTimestamp to be set', () => {
        const ctx: QueryStringContext = { sources: [ 'dummy' ], [KeysInitQuery.queryTimestamp.name]: new Date() };
        return expect(queryEngine.query('SELECT * WHERE { ?s ?p ?o }', ctx))
          .resolves.toBeTruthy();
      });

      it('should allow a parsed query to be passed', () => {
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
        const result = await queryEngine.query(
          'SELECT * WHERE { ?s ?p ?o }',
          { sources: [ 'dummy' ], 'the-answer': 42 },
        );
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

      it('should return a rejected promise on an invalid request', () => {
        const ctx: QueryStringContext = { sources: [ 'abc' ]};
        // Make it reject instead of reading input
        mediatorQueryOperation.mediate = (action: any) => Promise.reject(new Error('a'));
        return expect(queryEngine.query('INVALID QUERY', ctx)).rejects.toBeTruthy();
      });

      it('should return a rejected promise on an explain', () => {
        const ctx: QueryStringContext = { sources: [ 'abc' ], [KeysInitQuery.explain.name]: 'parsed' };
        return expect(queryEngine.query('BLA', ctx)).rejects
          .toThrowError('Tried to explain a query when in query-only mode');
      });
    });

    describe('SparqlQueryable methods', () => {
      describe('queryBindings', () => {
        it('handles a valid bindings query', async() => {
          input = new ArrayIterator([
            BF.bindings([
              [ DF.variable('a'), DF.namedNode('ex:a') ],
            ]),
          ]);
          await expect(await queryEngine.queryBindings('SELECT ...')).toEqualBindingsStream([
            BF.bindings([
              [ DF.variable('a'), DF.namedNode('ex:a') ],
            ]),
          ]);
        });

        it('rejects for an invalid bindings query', async() => {
          mediatorQueryOperation.mediate = jest.fn(() => Promise.resolve({ type: 'void' }));
          await expect(queryEngine.queryBindings('INSERT ...')).rejects
            .toThrowError(`Query result type 'bindings' was expected, while 'void' was found.`);
        });
      });

      describe('queryQuads', () => {
        it('handles a valid bindings query', async() => {
          input = new ArrayIterator([
            DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:a'), DF.namedNode('ex:a')),
          ]);
          mediatorQueryOperation.mediate = jest.fn(() => Promise.resolve({ type: 'quads', quadStream: input }));
          expect(await arrayifyStream(await queryEngine.queryQuads('CONSTRUCT ...'))).toEqualRdfQuadArray([
            DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:a'), DF.namedNode('ex:a')),
          ]);
        });

        it('rejects for an invalid bindings query', async() => {
          mediatorQueryOperation.mediate = jest.fn(() => Promise.resolve({ type: 'void' }));
          await expect(queryEngine.queryQuads('INSERT ...')).rejects
            .toThrowError(`Query result type 'quads' was expected, while 'void' was found.`);
        });
      });

      describe('queryBoolean', () => {
        it('handles a valid boolean query', async() => {
          mediatorQueryOperation.mediate = jest.fn(() => Promise.resolve({
            type: 'boolean',
            execute: () => Promise.resolve(true),
          }));
          expect(await queryEngine.queryBoolean('ASK ...')).toEqual(true);
        });

        it('rejects for an invalid boolean query', async() => {
          mediatorQueryOperation.mediate = jest.fn(() => Promise.resolve({ type: 'void' }));
          await expect(queryEngine.queryBoolean('INSERT ...')).rejects
            .toThrowError(`Query result type 'boolean' was expected, while 'void' was found.`);
        });
      });

      describe('queryVoid', () => {
        it('handles a valid void query', async() => {
          mediatorQueryOperation.mediate = jest.fn(() => Promise.resolve({
            type: 'void',
            execute: () => Promise.resolve(true),
          }));
          expect(await queryEngine.queryVoid('INSERT ...')).toEqual(true);
        });

        it('rejects for an invalid void query', async() => {
          mediatorQueryOperation.mediate = jest.fn(() => Promise.resolve({ type: 'boolean' }));
          await expect(queryEngine.queryVoid('ASK ...')).rejects
            .toThrowError(`Query result type 'void' was expected, while 'boolean' was found.`);
        });
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
            mediatorQueryParse: mediatorSparqlParse,
            mediatorQueryResultSerialize: med,
            mediatorQueryResultSerializeMediaTypeCombiner: med,
            mediatorQueryResultSerializeMediaTypeFormatCombiner: med,
            name: 'actor',
            queryString },
        );
        queryEngine = new QueryEngineBase(actor);
        return expect(queryEngine.getResultMediaTypeFormats())
          .resolves.toEqual({ data: 'DATA' });
      });
    });
  });

  describe('An QueryEngineBase instance with custom QueryContext', () => {
    interface ICustomQueryContext1 extends IQueryContextCommon {
      customField1: string;
    }
    interface ICustomQueryContext2 extends ICustomQueryContext1 {
      customField2: string;
    }
    const KeysCustom1 = {
      customField1: new ActionContextKey<string>('@comunica/actor-custom1:custom1'),
    };
    const KeysCustom2 = {
      customField2: new ActionContextKey<string>('@comunica/actor-custom2:custom2'),
    };
    class ActorInitQueryCustom1<QueryContext extends ICustomQueryContext1> extends ActorInitQuery<QueryContext> {
      public constructor(init: IActorInitQueryBaseArgs<QueryContext>) {
        if (!init.contextKeyShortcutsExtensions) {
          init.contextKeyShortcutsExtensions = [];
        }
        init.contextKeyShortcutsExtensions.push({ customField1: KeysCustom1.customField1.name });
        super(init);
      }
    }
    class ActorInitQueryCustom2<QueryContext extends ICustomQueryContext2 = ICustomQueryContext2>
      extends ActorInitQueryCustom1<QueryContext> {
      public constructor(init: IActorInitQueryBaseArgs<QueryContext>) {
        if (!init.contextKeyShortcutsExtensions) {
          init.contextKeyShortcutsExtensions = [];
        }
        init.contextKeyShortcutsExtensions.push({ customField2: KeysCustom2.customField2.name });
        super(init);
      }
    }

    let input: any;
    let actor: ActorInitQueryCustom2;
    let queryEngine: QueryEngineBase<ICustomQueryContext2>;

    beforeEach(() => {
      jest.resetAllMocks();
      input = new Readable({ objectMode: true });
      input._read = () => {
        const triple = { a: 'triple' };
        input.push(triple);
        input.push(null);
      };
      const factory = new Factory();
      mediatorContextPreprocess.mediate = jest.fn(
        (action: any) => Promise.resolve(action),
      );
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
      actor = new ActorInitQueryCustom2(
        { bus,
          contextKeyShortcuts,
          defaultQueryInputFormat,
          logger,
          mediatorContextPreprocess,
          mediatorHttpInvalidate,
          mediatorOptimizeQueryOperation,
          mediatorQueryOperation,
          mediatorQueryParse: mediatorSparqlParse,
          mediatorQueryResultSerialize: mediatorSparqlSerialize,
          mediatorQueryResultSerializeMediaTypeCombiner: mediatorSparqlSerialize,
          mediatorQueryResultSerializeMediaTypeFormatCombiner: mediatorSparqlSerialize,
          name: 'actor' },
      );
      queryEngine = new QueryEngineBase<ICustomQueryContext2>(actor);
    });

    it('should query and pass custom context fields to action context', async() => {
      const ctx: QueryStringContext & ICustomQueryContext2 = {
        sources: [ 'dummy' ],
        customField1: 'custom value 1',
        customField2: 'custom value 2',
      };

      await expect(queryEngine.query('SELECT * WHERE { ?s ?p ?o }', ctx))
        .resolves.toBeTruthy();

      expect(mediatorContextPreprocess.mediate).toHaveBeenCalledTimes(1);

      const actionContext: IActionContext = mediatorContextPreprocess.mediate.mock.calls[0][0].context;
      expect(actionContext.get(KeysCustom1.customField1)).toBe('custom value 1');
      expect(actionContext.get(KeysCustom2.customField2)).toBe('custom value 2');
    });
  });

  describe('An QueryEngineBase instance for quads', () => {
    let actor: ActorInitQuery;
    let queryEngine: QueryEngineBase;

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
          mediatorQueryParse: mediatorSparqlParse,
          mediatorQueryResultSerialize: mediatorSparqlSerialize,
          mediatorQueryResultSerializeMediaTypeCombiner: mediatorSparqlSerialize,
          mediatorQueryResultSerializeMediaTypeFormatCombiner: mediatorSparqlSerialize,
          name: 'actor' },
      );
      queryEngine = new QueryEngineBase(actor);
    });

    it('should return a rejected promise on an invalid request', () => {
      // Make it reject instead of reading input
      mediatorQueryOperation.mediate = (action: any) => Promise.reject(new Error('a'));
      return expect(queryEngine.query('INVALID QUERY', { sources: [ 'abc' ]})).rejects.toBeTruthy();
    });
  });

  describe('internalToFinalResult', () => {
    it('converts bindings', async() => {
      const final = <QueryType & IQueryBindingsEnhanced> QueryEngineBase.internalToFinalResult({
        type: 'bindings',
        bindingsStream: new ArrayIterator([
          BF.bindings([
            [ DF.variable('a'), DF.namedNode('ex:a') ],
          ]),
        ]),
        metadata: async() => ({
          cardinality: { type: 'estimate', value: 1 },
          canContainUndefs: false,
          variables: [ DF.variable('a') ],
        }),
        context: new ActionContext({ c: 'd' }),
      });

      expect(final.resultType).toEqual('bindings');
      await expect(await final.execute()).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('a'), DF.namedNode('ex:a') ],
        ]),
      ]);
      expect(await final.metadata()).toEqual({
        cardinality: { type: 'estimate', value: 1 },
        canContainUndefs: false,
        variables: [ DF.variable('a') ],
      });
      expect(final.context).toEqual(new ActionContext({ c: 'd' }));
    });

    it('converts quads', async() => {
      const final = <QueryType & IQueryQuadsEnhanced> QueryEngineBase.internalToFinalResult({
        type: 'quads',
        quadStream: new ArrayIterator([
          DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:a'), DF.namedNode('ex:a')),
        ]),
        metadata: async() => ({
          cardinality: { type: 'estimate', value: 1 },
          canContainUndefs: false,
          variables: [ DF.variable('a') ],
        }),
        context: new ActionContext({ c: 'd' }),
      });

      expect(final.resultType).toEqual('quads');
      expect(await arrayifyStream(await final.execute())).toEqualRdfQuadArray([
        DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:a'), DF.namedNode('ex:a')),
      ]);
      expect(await final.metadata()).toEqual({
        cardinality: { type: 'estimate', value: 1 },
        canContainUndefs: false,
        variables: [ DF.variable('a') ],
      });
      expect(final.context).toEqual(new ActionContext({ c: 'd' }));
    });

    it('converts booleans', async() => {
      const final = <QueryType & RDF.QueryBoolean> QueryEngineBase.internalToFinalResult({
        type: 'boolean',
        execute: () => Promise.resolve(true),
        context: new ActionContext({ c: 'd' }),
      });

      expect(final.resultType).toEqual('boolean');
      expect(await final.execute()).toEqual(true);
      expect(final.context).toEqual(new ActionContext({ c: 'd' }));
    });

    it('converts voids', async() => {
      const final = <QueryType & RDF.QueryVoid> QueryEngineBase.internalToFinalResult({
        type: 'void',
        execute: () => Promise.resolve(),
        context: new ActionContext({ c: 'd' }),
      });

      expect(final.resultType).toEqual('void');
      expect(await final.execute()).toBeUndefined();
      expect(final.context).toEqual(new ActionContext({ c: 'd' }));
    });
  });

  describe('finalToInternalResult', () => {
    it('converts bindings', async() => {
      const internal = <IQueryOperationResultBindings> await QueryEngineBase.finalToInternalResult({
        resultType: 'bindings',
        execute: async() => new ArrayIterator([
          BF.bindings([
            [ DF.variable('a'), DF.namedNode('ex:a') ],
          ]),
        ]),
        metadata: async() => (<any>{
          cardinality: { type: 'estimate', value: 1 },
          canContainUndefs: false,
          variables: [ DF.variable('a') ],
        }),
      });

      expect(internal.type).toEqual('bindings');
      await expect(internal.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('a'), DF.namedNode('ex:a') ],
        ]),
      ]);
      expect(await internal.metadata()).toEqual({
        cardinality: { type: 'estimate', value: 1 },
        canContainUndefs: false,
        variables: [ DF.variable('a') ],
      });
    });

    it('converts quads', async() => {
      const internal = <IQueryOperationResultQuads> await QueryEngineBase.finalToInternalResult({
        resultType: 'quads',
        execute: async() => new ArrayIterator([
          DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:a'), DF.namedNode('ex:a')),
        ]),
        metadata: async() => (<any>{ cardinality: 1, canContainUndefs: false }),
      });

      expect(internal.type).toEqual('quads');
      expect(await arrayifyStream(internal.quadStream)).toEqualRdfQuadArray([
        DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:a'), DF.namedNode('ex:a')),
      ]);
      expect(await internal.metadata()).toEqual({
        cardinality: 1,
        canContainUndefs: false,
      });
    });

    it('converts booleans', async() => {
      const final = <IQueryOperationResultBoolean> await QueryEngineBase.finalToInternalResult({
        resultType: 'boolean',
        execute: async() => true,
      });

      expect(final.type).toEqual('boolean');
      expect(await final.execute()).toEqual(true);
    });

    it('converts voids', async() => {
      const final = <IQueryOperationResultVoid> await QueryEngineBase.finalToInternalResult({
        resultType: 'void',
        // eslint-disable-next-line unicorn/no-useless-undefined
        execute: async() => undefined,
      });

      expect(final.type).toEqual('void');
      expect(await final.execute()).toBeUndefined();
    });
  });
});
