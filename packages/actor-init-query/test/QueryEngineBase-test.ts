import { Readable, Transform } from 'node:stream';
import { KeysInitQuery } from '@comunica/context-entries';
import { Bus, ActionContext } from '@comunica/core';
import type {
  IActionContext,
  QueryStringContext,
  IQueryBindingsEnhanced,
  IQueryQuadsEnhanced,
  QueryType,
  IQueryOperationResultQuads,
  IQueryOperationResultBindings,
  IQueryOperationResultBoolean,
  IQueryOperationResultVoid,
  IQueryEngine,
} from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import { toAlgebra } from '@traqula/algebra-sparql-1-2';
import { Parser } from '@traqula/parser-sparql-1-2';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { QueryEngineBase } from '../lib';
import { ActorInitQuery } from '../lib/ActorInitQuery';
import { ActorInitQueryBase } from '../lib/ActorInitQueryBase';
import '@comunica/utils-jest';
import 'jest-rdf';

const DF = new DataFactory();
const BF = new BindingsFactory(DF, {});
const parser = new Parser();

describe('ActorInitQueryBase', () => {
  it('should not allow invoking its run method', async() => {
    await expect(new (<any> ActorInitQueryBase)({ bus: new Bus({ name: 'bus' }) }).run()).rejects.toBeTruthy();
  });
});

describe('QueryEngineBase', () => {
  let bus: any;
  let mediatorQueryProcess: any;
  let mediatorSparqlSerialize: any;
  let mediatorHttpInvalidate: any;
  let actorInitQuery: ActorInitQuery;
  let context: IActionContext;
  let input: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    input = new Readable({ objectMode: true });
    input._read = () => {
      const triple = { a: 'triple' };
      input.push(triple);
      input.push(null);
    };
    mediatorQueryProcess = <any>{
      mediate: jest.fn((action: any) => {
        if (action.context.has(KeysInitQuery.explain)) {
          return Promise.resolve({
            result: {
              explain: 'true',
              data: 'EXPLAINED',
            },
          });
        }
        return action.query === 'INVALID' ?
          Promise.reject(new Error('Invalid query')) :
          Promise.resolve({
            result: { type: 'bindings', bindingsStream: input, metadata: () => ({}), context: action.context },
          });
      }),
    };
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
      mediate: () => Promise.resolve(true),
    };
    actorInitQuery = <any> {};
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
      expect(() => {
        (<any> QueryEngineBase)();
      }).toThrow(`Class constructor QueryEngineBase cannot be invoked without 'new'`);
    });
  });

  describe('An QueryEngineBase instance', () => {
    const queryString = 'SELECT * WHERE { ?s ?p ?o } LIMIT 100';
    let actor: ActorInitQuery;
    let queryEngine: IQueryEngine;

    beforeEach(() => {
      const defaultQueryInputFormat = 'sparql';

      actor = new ActorInitQuery({
        bus,
        defaultQueryInputFormat,
        mediatorHttpInvalidate,
        mediatorQueryProcess,
        mediatorQueryResultSerialize: mediatorSparqlSerialize,
        mediatorQueryResultSerializeMediaTypeCombiner: mediatorSparqlSerialize,
        mediatorQueryResultSerializeMediaTypeFormatCombiner: mediatorSparqlSerialize,
        name: 'actor',
      });
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
      it('should apply bindings when initialBindings are passed via the context', async() => {
        const ctx: QueryStringContext = {
          sources: [ 'dummy' ],
          '@comunica/actor-init-query:initialBindings': BF.bindings([
            [ DF.variable('s'), DF.literal('sl') ],
          ]),
        };
        await expect(queryEngine.query('SELECT * WHERE { ?s ?p ?o }', ctx))
          .resolves.toBeTruthy();
      });

      it('should apply bindings when initialBindings in the old format are passed via the context', async() => {
        const ctx: QueryStringContext = {
          sources: [ 'dummy' ],
          initialBindings: BF.bindings([
            [ DF.variable('s'), DF.literal('sl') ],
          ]),
        };
        await expect(queryEngine.query('SELECT * WHERE { ?s ?p ?o }', ctx))
          .resolves.toBeTruthy();
      });

      it('should apply bindings when sources in the old format are passed via the context', async() => {
        await expect(queryEngine.query('SELECT * WHERE { ?s ?p ?o }', { sources: [ 'abc' ]}))
          .resolves.toBeTruthy();
      });

      it('should allow query to be called without context', async() => {
        await expect(queryEngine.query('SELECT * WHERE { ?s ?p ?o }'))
          .resolves.toBeTruthy();
      });

      it('should allow KeysInitSparql.queryTimestamp to be set', async() => {
        const ctx: QueryStringContext = { sources: [ 'dummy' ], [KeysInitQuery.queryTimestamp.name]: new Date() };
        await expect(queryEngine.query('SELECT * WHERE { ?s ?p ?o }', ctx))
          .resolves.toBeTruthy();
      });

      it('should allow a parsed query to be passed', async() => {
        await expect(queryEngine.query(toAlgebra(parser.parse('SELECT * WHERE { ?s ?p ?o }'))))
          .resolves.toBeTruthy();
      });

      it('should not modify the baseIRI without BASE in query', async() => {
        expect((<any> (await queryEngine.query('SELECT * WHERE { ?s ?p ?o }')).context)
          .toJS()['@comunica/actor-init-query:baseIRI']).toBeFalsy();
      });

      it('should allow process actors to modify the context', async() => {
        mediatorQueryProcess.mediate = (action: any) => {
          return Promise.resolve({
            result: {
              type: 'bindings',
              bindingsStream: input,
              metadata: () => ({}),
              context: action.context.setRaw('the-answer', 42),
            },
          });
        };
        const result = await queryEngine.query('SELECT * WHERE { ?s ?p ?o }');
        expect(result).toHaveProperty('context');
        expect((<ActionContext> result.context).getRaw('the-answer')).toBe(42);
      });

      it('should return a rejected promise on an invalid request', async() => {
        const ctx: QueryStringContext = { sources: [ 'abc' ]};
        // Make it reject instead of reading input
        mediatorQueryProcess.mediate = () => Promise.reject(new Error('a'));
        await expect(queryEngine.query('INVALID QUERY', ctx)).rejects.toBeTruthy();
      });

      it('should return a rejected promise on an explain', async() => {
        const ctx: QueryStringContext = { sources: [ 'abc' ], [KeysInitQuery.explain.name]: 'parsed' };
        await expect(queryEngine.query('BLA', ctx)).rejects
          .toThrow('Tried to explain a query when in query-only mode');
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
          await expect(queryEngine.queryBindings('SELECT ...')).resolves.toEqualBindingsStream([
            BF.bindings([
              [ DF.variable('a'), DF.namedNode('ex:a') ],
            ]),
          ]);
        });

        it('rejects for an invalid bindings query', async() => {
          jest.spyOn(mediatorQueryProcess, 'mediate').mockResolvedValue({ result: { type: 'void' }});
          await expect(queryEngine.queryBindings('INSERT ...')).rejects
            .toThrow(`Query result type 'bindings' was expected, while 'void' was found.`);
        });
      });

      describe('queryQuads', () => {
        it('handles a valid bindings query', async() => {
          input = new ArrayIterator([
            DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:a'), DF.namedNode('ex:a')),
          ]);
          jest.spyOn(mediatorQueryProcess, 'mediate')
            .mockResolvedValue({ result: { type: 'quads', quadStream: input }});
          await expect(arrayifyStream(await queryEngine.queryQuads('CONSTRUCT ...'))).resolves.toEqualRdfQuadArray([
            DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:a'), DF.namedNode('ex:a')),
          ]);
        });

        it('rejects for an invalid bindings query', async() => {
          jest.spyOn(mediatorQueryProcess, 'mediate').mockResolvedValue({ result: { type: 'void' }});
          await expect(queryEngine.queryQuads('INSERT ...')).rejects
            .toThrow(`Query result type 'quads' was expected, while 'void' was found.`);
        });
      });

      describe('queryBoolean', () => {
        it('handles a valid boolean query', async() => {
          jest.spyOn(mediatorQueryProcess, 'mediate').mockResolvedValue({
            result: {
              type: 'boolean',
              execute: () => Promise.resolve(true),
            },
          });
          await expect(queryEngine.queryBoolean('ASK ...')).resolves.toBe(true);
        });

        it('rejects for an invalid boolean query', async() => {
          jest.spyOn(mediatorQueryProcess, 'mediate').mockResolvedValue({ result: { type: 'void' }});
          await expect(queryEngine.queryBoolean('INSERT ...')).rejects
            .toThrow(`Query result type 'boolean' was expected, while 'void' was found.`);
        });
      });

      describe('queryVoid', () => {
        it('handles a valid void query', async() => {
          jest.spyOn(mediatorQueryProcess, 'mediate').mockResolvedValue({
            result: {
              type: 'void',
              execute: () => Promise.resolve(true),
            },
          });
          await expect(queryEngine.queryVoid('INSERT ...')).resolves.toBe(true);
        });

        it('rejects for an invalid void query', async() => {
          jest.spyOn(mediatorQueryProcess, 'mediate').mockResolvedValue({
            result: { type: 'boolean' },
          });
          await expect(queryEngine.queryVoid('ASK ...')).rejects
            .toThrow(`Query result type 'void' was expected, while 'boolean' was found.`);
        });
      });
    });

    describe('getResultMediaTypeFormats', () => {
      it('should return the media type formats', async() => {
        const med: any = {
          mediate: () => Promise.resolve({ mediaTypeFormats: { data: 'DATA' }}),
        };
        actor = new ActorInitQuery({
          bus,
          mediatorHttpInvalidate,
          mediatorQueryProcess,
          mediatorQueryResultSerialize: med,
          mediatorQueryResultSerializeMediaTypeCombiner: med,
          mediatorQueryResultSerializeMediaTypeFormatCombiner: med,
          name: 'actor',
          queryString,
        });
        queryEngine = new QueryEngineBase(actor);
        await expect(queryEngine.getResultMediaTypeFormats())
          .resolves.toEqual({ data: 'DATA' });
      });
    });
  });

  describe('An QueryEngineBase instance for quads', () => {
    let actor: ActorInitQuery;
    let queryEngine: QueryEngineBase;

    beforeEach(() => {
      mediatorQueryProcess.mediate = (action: any) => action.operation.query === 'INVALID' ?
        Promise.reject(new Error('a')) :
        Promise.resolve({ quadStream: input, type: 'quads' });
      const defaultQueryInputFormat = 'sparql';
      actor = new ActorInitQuery({
        bus,
        defaultQueryInputFormat,
        mediatorHttpInvalidate,
        mediatorQueryProcess,
        mediatorQueryResultSerialize: mediatorSparqlSerialize,
        mediatorQueryResultSerializeMediaTypeCombiner: mediatorSparqlSerialize,
        mediatorQueryResultSerializeMediaTypeFormatCombiner: mediatorSparqlSerialize,
        name: 'actor',
      });
      queryEngine = new QueryEngineBase(actor);
    });

    it('should return a rejected promise on an invalid request', async() => {
      // Make it reject instead of reading input
      mediatorQueryProcess.mediate = () => Promise.reject(new Error('a'));
      await expect(queryEngine.query('INVALID QUERY', { sources: [ 'abc' ]})).rejects.toBeTruthy();
    });
  });

  describe('internalToFinalResult', () => {
    it('converts bindings', async() => {
      const final = <QueryType & IQueryBindingsEnhanced> QueryEngineBase.internalToFinalResult({
        type: 'bindings',
        bindingsStream: new ArrayIterator<RDF.Bindings>([
          BF.bindings([
            [ DF.variable('a'), DF.namedNode('ex:a') ],
          ]),
        ]),
        metadata: async() => ({
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 1 },

          variables: [{ variable: DF.variable('a'), canBeUndef: false }],
        }),
        context: new ActionContext({ c: 'd' }),
      });

      expect(final.resultType).toBe('bindings');
      await expect(final.execute()).resolves.toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('a'), DF.namedNode('ex:a') ],
        ]),
      ]);
      await expect(final.metadata()).resolves.toEqual({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'estimate', value: 1 },

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
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 1 },

          variables: [{ variable: DF.variable('a'), canBeUndef: false }],
        }),
        context: new ActionContext({ c: 'd' }),
      });

      expect(final.resultType).toBe('quads');
      await expect(arrayifyStream(await final.execute())).resolves.toEqualRdfQuadArray([
        DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:a'), DF.namedNode('ex:a')),
      ]);
      await expect(final.metadata()).resolves.toEqual({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'estimate', value: 1 },

        variables: [{ variable: DF.variable('a'), canBeUndef: false }],
      });
      expect(final.context).toEqual(new ActionContext({ c: 'd' }));
    });

    it('converts booleans', async() => {
      const final = <QueryType & RDF.QueryBoolean> QueryEngineBase.internalToFinalResult({
        type: 'boolean',
        execute: () => Promise.resolve(true),
        context: new ActionContext({ c: 'd' }),
      });

      expect(final.resultType).toBe('boolean');
      await expect(final.execute()).resolves.toBe(true);
      expect(final.context).toEqual(new ActionContext({ c: 'd' }));
    });

    it('converts voids', async() => {
      const final = <QueryType & RDF.QueryVoid> QueryEngineBase.internalToFinalResult({
        type: 'void',
        execute: () => Promise.resolve(),
        context: new ActionContext({ c: 'd' }),
      });

      expect(final.resultType).toBe('void');
      await expect(final.execute()).resolves.toBeUndefined();
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

          variables: [ DF.variable('a') ],
        }),
      });

      expect(internal.type).toBe('bindings');
      await expect(internal.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('a'), DF.namedNode('ex:a') ],
        ]),
      ]);
      await expect(internal.metadata()).resolves.toEqual({
        cardinality: { type: 'estimate', value: 1 },

        variables: [{ variable: DF.variable('a'), canBeUndef: false }],
      });
    });

    it('converts quads', async() => {
      const internal = <IQueryOperationResultQuads> await QueryEngineBase.finalToInternalResult({
        resultType: 'quads',
        execute: async() => new ArrayIterator([
          DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:a'), DF.namedNode('ex:a')),
        ]),
        metadata: async() => (<any>{ cardinality: 1 }),
      });

      expect(internal.type).toBe('quads');
      await expect(arrayifyStream(internal.quadStream)).resolves.toEqualRdfQuadArray([
        DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:a'), DF.namedNode('ex:a')),
      ]);
      await expect(internal.metadata()).resolves.toEqual({
        cardinality: 1,

      });
    });

    it('converts booleans', async() => {
      const final = <IQueryOperationResultBoolean> await QueryEngineBase.finalToInternalResult({
        resultType: 'boolean',
        execute: async() => true,
      });

      expect(final.type).toBe('boolean');
      await expect(final.execute()).resolves.toBe(true);
    });

    it('converts voids', async() => {
      const final = <IQueryOperationResultVoid> await QueryEngineBase.finalToInternalResult({
        resultType: 'void',

        execute: async() => undefined,
      });

      expect(final.type).toBe('void');
      await expect(final.execute()).resolves.toBeUndefined();
    });
  });
});
