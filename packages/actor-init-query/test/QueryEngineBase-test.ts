import { Readable, Transform } from 'stream';
import { BindingsFactory } from '@comunica/bindings-factory';
import { KeysInitQuery } from '@comunica/context-entries';
import { Bus, ActionContext } from '@comunica/core';
import type {
  IPhysicalQueryPlanLogger,
  IActionContext, QueryStringContext, IQueryBindingsEnhanced, IQueryQuadsEnhanced,
  QueryType, IQueryOperationResultQuads,
  IQueryOperationResultBindings, IQueryOperationResultBoolean, IQueryOperationResultVoid,
} from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { translate } from 'sparqlalgebrajs';
import Factory from 'sparqlalgebrajs/lib/factory';
import { QueryEngineBase } from '../lib';
import { ActorInitQuery } from '../lib/ActorInitQuery';
import { ActorInitQueryBase } from '../lib/ActorInitQueryBase';
import '@comunica/jest';
import 'jest-rdf';
const arrayifyStream = require('arrayify-stream');

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
    let input: any;
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
          '@comunica/actor-init-query:initialBindings': BF.bindings([
            [ DF.variable('s'), DF.literal('sl') ],
          ]),
        };
        return expect(queryEngine.query('SELECT * WHERE { ?s ?p ?o }', ctx))
          .resolves.toBeTruthy();
      });

      it('should apply bindings when initialBindings in the old format are passed via the context', () => {
        const ctx: QueryStringContext = {
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
        const ctx: QueryStringContext = { [KeysInitQuery.queryTimestamp.name]: new Date() };
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
        const result = await queryEngine.query('SELECT * WHERE { ?s ?p ?o }', { sources: [ 'abc' ]});
        const array = await (<IQueryBindingsEnhanced> result).bindings();
        expect(array).toEqual([{ a: 'triple' }]);
      });

      it('bindings() should return empty list if no solutions', async() => {
        // Set input empty
        const inputThis = new Readable({ objectMode: true });
        inputThis._read = () => {
          inputThis.push(null);
        };
        mediatorQueryOperation.mediate = (action: any) => action.operation.query !== 'INVALID' ?
          Promise.resolve({ bindingsStream: inputThis, type: 'bindings' }) :
          Promise.reject(new Error('a'));
        const result = await queryEngine.query('SELECT * WHERE { ?s ?p ?o }', { sources: [ 'abc' ]});
        const array = await (<IQueryBindingsEnhanced> result).bindings();
        expect(array).toEqual([]);
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
            booleanResult: Promise.resolve(true),
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
            voidResult: Promise.resolve(true),
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
          mediatorQueryParse: mediatorSparqlParse,
          mediatorQueryResultSerialize: mediatorSparqlSerialize,
          mediatorQueryResultSerializeMediaTypeCombiner: mediatorSparqlSerialize,
          mediatorQueryResultSerializeMediaTypeFormatCombiner: mediatorSparqlSerialize,
          name: 'actor' },
      );
      queryEngine = new QueryEngineBase(actor);
    });

    it('quads() should collect all quads until "end" event occurs', async() => {
      const ctx: QueryStringContext = { sources: [ 'abc' ]};
      const result = await queryEngine.query('CONSTRUCT WHERE { ?s ?p ?o }', ctx);
      const array = await (<IQueryQuadsEnhanced> result).quads();
      expect(array).toEqual([ DF.quad(
        DF.namedNode('http://dbpedia.org/resource/Renault_Dauphine'),
        DF.namedNode('http://dbpedia.org/ontology/assembly'),
        DF.namedNode('http://dbpedia.org/resource/Belgium'),
        DF.defaultGraph(),
      ) ]);
    });

    it('quads() should return empty list if no solutions', async() => {
      const ctx: QueryStringContext = { sources: [ 'abc' ]};
      // Set input empty
      const input = new Readable({ objectMode: true });
      input._read = () => {
        input.push(null);
      };
      mediatorQueryOperation.mediate = (action: any) => action.operation.query !== 'INVALID' ?
        Promise.resolve({ quadStream: input, type: 'quads' }) :
        Promise.reject(new Error('a'));
      const result = await queryEngine.query('CONSTRUCT * WHERE { ?s ?p ?o }', ctx);
      const array = await (<IQueryQuadsEnhanced> result).quads();
      expect(array).toEqual([]);
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
        variables: [ DF.variable('a') ],
        metadata: async() => ({ cardinality: 1, canContainUndefs: false }),
        context: new ActionContext({ c: 'd' }),
      });

      expect(final.resultType).toEqual('bindings');
      await expect(await final.execute()).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('a'), DF.namedNode('ex:a') ],
        ]),
      ]);
      expect(await final.metadata()).toEqual({
        cardinality: 1,
        canContainUndefs: false,
        variables: [ DF.variable('a') ],
      });
      expect(final.context).toEqual(new ActionContext({ c: 'd' }));
      expect(final.bindings).toBeTruthy();
    });

    it('converts quads', async() => {
      const final = <QueryType & IQueryQuadsEnhanced> QueryEngineBase.internalToFinalResult({
        type: 'quads',
        quadStream: new ArrayIterator([
          DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:a'), DF.namedNode('ex:a')),
        ]),
        metadata: async() => ({ cardinality: 1, canContainUndefs: false }),
        context: new ActionContext({ c: 'd' }),
      });

      expect(final.resultType).toEqual('quads');
      expect(await arrayifyStream(await final.execute())).toEqualRdfQuadArray([
        DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:a'), DF.namedNode('ex:a')),
      ]);
      expect(await final.metadata()).toEqual({
        cardinality: 1,
        canContainUndefs: false,
      });
      expect(final.context).toEqual(new ActionContext({ c: 'd' }));
      expect(final.quads).toBeTruthy();
    });

    it('converts booleans', async() => {
      const final = <QueryType & RDF.QueryBoolean> QueryEngineBase.internalToFinalResult({
        type: 'boolean',
        booleanResult: Promise.resolve(true),
        context: new ActionContext({ c: 'd' }),
      });

      expect(final.resultType).toEqual('boolean');
      expect(await final.execute()).toEqual(true);
      expect(final.context).toEqual(new ActionContext({ c: 'd' }));
    });

    it('converts voids', async() => {
      const final = <QueryType & RDF.QueryVoid> QueryEngineBase.internalToFinalResult({
        type: 'void',
        voidResult: Promise.resolve(),
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
        metadata: async() => (<any>{ cardinality: 1, canContainUndefs: false, variables: [ DF.variable('a') ]}),
      });

      expect(internal.type).toEqual('bindings');
      await expect(internal.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('a'), DF.namedNode('ex:a') ],
        ]),
      ]);
      expect(await internal.metadata()).toEqual({
        cardinality: 1,
        canContainUndefs: false,
        variables: [ DF.variable('a') ],
      });
      expect(internal.variables).toEqual([ DF.variable('a') ]);
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
      expect(await final.booleanResult).toEqual(true);
    });

    it('converts voids', async() => {
      const final = <IQueryOperationResultVoid> await QueryEngineBase.finalToInternalResult({
        resultType: 'void',
        // eslint-disable-next-line unicorn/no-useless-undefined
        execute: async() => undefined,
      });

      expect(final.type).toEqual('void');
      expect(await final.voidResult).toBeUndefined();
    });
  });
});
