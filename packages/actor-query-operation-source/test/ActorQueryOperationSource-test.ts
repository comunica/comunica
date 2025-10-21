import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type {
  IActionContext,
  IQueryOperationResultBindings,
  IQueryOperationResultBoolean,
  IQueryOperationResultQuads,
  IQueryOperationResultVoid,
  IQuerySourceWrapper,
  IPhysicalQueryPlanLogger,
} from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { assignOperationSource } from '@comunica/utils-query-operation';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationSource } from '../lib/ActorQueryOperationSource';
import 'jest-rdf';
import '@comunica/utils-jest';

const AF = new AlgebraFactory();
const DF = new DataFactory();

describe('ActorQueryOperationSource', () => {
  let bus: any;

  let ctx: IActionContext;
  let source1: IQuerySourceWrapper;

  beforeEach(() => {
    ctx = new ActionContext();
    bus = new Bus({ name: 'bus' });
    source1 = <any> {
      source: {
        referenceValue: 'source1',
        queryBindings: jest.fn(() => {
          const bindingsStream = new ArrayIterator([], { autoStart: false });
          bindingsStream.setProperty('metadata', { cardinality: { value: 10 }, variables: []});
          return bindingsStream;
        }),
        queryQuads: jest.fn(() => {
          const quadStream = new ArrayIterator([], { autoStart: false });
          quadStream.setProperty('metadata', { cardinality: { value: 10 }});
          return quadStream;
        }),
        async queryBoolean() {
          return true;
        },
        async queryVoid() {
          // Do nothing
        },
      },
    };
  });

  describe('An ActorQueryOperationSource instance', () => {
    let actor: ActorQueryOperationSource;

    beforeEach(() => {
      actor = new ActorQueryOperationSource({ name: 'actor', bus });
    });

    describe('test', () => {
      it('should handle operations with top-level source', async() => {
        await expect(actor.test({
          context: new ActionContext(),
          operation: assignOperationSource(AF.createNop(), <any>{}),
        })).resolves.toPassTest({ httpRequests: 1 });
      });

      it('should not handle operations without top-level source', async() => {
        await expect(actor.test({ context: new ActionContext(), operation: AF.createNop() }))
          .resolves.toFailTest(`Actor actor requires an operation with source annotation.`);
      });
    });

    describe('run', () => {
      it('should handle sliced construct operations', async() => {
        const opIn = assignOperationSource(
          AF.createSlice(AF.createConstruct(AF.createNop(), []), 1),
          source1,
        );
        const result: IQueryOperationResultQuads = <any> await actor.run({ operation: opIn, context: ctx });
        expect(result.type).toBe('quads');
        await expect(result.metadata()).resolves.toEqual({ cardinality: { value: 10 }});
        await expect(result.quadStream.toArray()).resolves.toBeRdfIsomorphic([]);
      });

      it('should handle sliced from construct operations', async() => {
        const opIn = assignOperationSource(
          AF.createSlice(AF.createFrom(
            AF.createConstruct(AF.createNop(), []),
            [],
            [],
          ), 1),
          source1,
        );
        const result: IQueryOperationResultQuads = <any> await actor.run({ operation: opIn, context: ctx });
        expect(result.type).toBe('quads');
        await expect(result.metadata()).resolves.toEqual({ cardinality: { value: 10 }});
        await expect(result.quadStream.toArray()).resolves.toBeRdfIsomorphic([]);
      });

      it('should handle construct operations', async() => {
        const opIn = assignOperationSource(AF.createConstruct(AF.createNop(), []), source1);
        const result: IQueryOperationResultQuads = <any> await actor.run({ operation: opIn, context: ctx });
        expect(result.type).toBe('quads');
        await expect(result.metadata()).resolves.toEqual({ cardinality: { value: 10 }});
        await expect(result.quadStream.toArray()).resolves.toBeRdfIsomorphic([]);
      });

      it('should handle ask operations', async() => {
        const opIn = assignOperationSource(AF.createAsk(AF.createNop()), source1);
        const result: IQueryOperationResultBoolean = <any> await actor.run({ operation: opIn, context: ctx });
        expect(result.type).toBe('boolean');
        await expect(result.execute()).resolves.toBe(true);
      });

      describe('for update operations', () => {
        it('should handle composite updates', async() => {
          const opIn = assignOperationSource(AF.createCompositeUpdate([]), source1);
          const result: IQueryOperationResultVoid = <any> await actor.run({ operation: opIn, context: ctx });
          expect(result.type).toBe('void');
          await result.execute();
        });

        it('should handle delete insert', async() => {
          const opIn = assignOperationSource(AF.createDeleteInsert([], []), source1);
          const result: IQueryOperationResultVoid = <any> await actor.run({ operation: opIn, context: ctx });
          expect(result.type).toBe('void');
          await result.execute();
        });

        it('should handle load', async() => {
          const opIn = assignOperationSource(AF.createLoad(DF.namedNode('s')), source1);
          const result: IQueryOperationResultVoid = <any> await actor.run({ operation: opIn, context: ctx });
          expect(result.type).toBe('void');
          await result.execute();
        });

        it('should handle clear', async() => {
          const opIn = assignOperationSource(AF.createClear(DF.namedNode('s')), source1);
          const result: IQueryOperationResultVoid = <any> await actor.run({ operation: opIn, context: ctx });
          expect(result.type).toBe('void');
          await result.execute();
        });

        it('should handle create', async() => {
          const opIn = assignOperationSource(AF.createCreate(DF.namedNode('s')), source1);
          const result: IQueryOperationResultVoid = <any> await actor.run({ operation: opIn, context: ctx });
          expect(result.type).toBe('void');
          await result.execute();
        });

        it('should handle drop', async() => {
          const opIn = assignOperationSource(AF.createDrop(DF.namedNode('s')), source1);
          const result: IQueryOperationResultVoid = <any> await actor.run({ operation: opIn, context: ctx });
          expect(result.type).toBe('void');
          await result.execute();
        });

        it('should handle add', async() => {
          const opIn = assignOperationSource(AF.createAdd('DEFAULT', DF.namedNode('s')), source1);
          const result: IQueryOperationResultVoid = <any> await actor.run({ operation: opIn, context: ctx });
          expect(result.type).toBe('void');
          await result.execute();
        });

        it('should handle move', async() => {
          const opIn = assignOperationSource(AF.createMove('DEFAULT', DF.namedNode('s')), source1);
          const result: IQueryOperationResultVoid = <any> await actor.run({ operation: opIn, context: ctx });
          expect(result.type).toBe('void');
          await result.execute();
        });

        it('should handle copy', async() => {
          const opIn = assignOperationSource(AF.createCopy('DEFAULT', DF.namedNode('s')), source1);
          const result: IQueryOperationResultVoid = <any> await actor.run({ operation: opIn, context: ctx });
          expect(result.type).toBe('void');
          await result.execute();
        });
      });

      it('should handle bindings operations', async() => {
        const opIn = assignOperationSource(AF.createNop(), source1);
        const result: IQueryOperationResultBindings = <any> await actor.run({ operation: opIn, context: ctx });
        expect(result.type).toBe('bindings');
        await expect(result.metadata()).resolves.toEqual({
          cardinality: { value: 10 },

          variables: [],
        });
        await expect(result.bindingsStream).toEqualBindingsStream([]);
      });

      it('should handle sliced bindings operations', async() => {
        const opIn = assignOperationSource(AF.createSlice(AF.createNop(), 1), source1);
        const result: IQueryOperationResultBindings = <any> await actor.run({ operation: opIn, context: ctx });
        expect(result.type).toBe('bindings');
        await expect(result.metadata()).resolves.toEqual({
          cardinality: { value: 10 },

          variables: [],
        });
        await expect(result.bindingsStream).toEqualBindingsStream([]);
      });

      it('should handle bindings operations and invokes the logger', async() => {
        const parentNode = '';
        const logger: IPhysicalQueryPlanLogger = {
          logOperation: jest.fn(),
          toJson: jest.fn(),
          stashChildren: jest.fn(),
          unstashChild: jest.fn(),
          appendMetadata: jest.fn(),
        };
        ctx = new ActionContext({
          [KeysInitQuery.physicalQueryPlanLogger.name]: logger,
          [KeysInitQuery.physicalQueryPlanNode.name]: parentNode,
        });

        const opIn = assignOperationSource(AF.createNop(), source1);
        const result: IQueryOperationResultBindings = <any> await actor.run({ operation: opIn, context: ctx });
        expect(result.type).toBe('bindings');
        await expect(result.metadata()).resolves.toEqual({
          cardinality: { value: 10 },

          variables: [],
        });
        await expect(result.bindingsStream).toEqualBindingsStream([]);

        expect(logger.logOperation).toHaveBeenCalledWith(
          'nop',
          undefined,
          opIn,
          parentNode,
          'actor',
          {},
        );
      });
    });
  });
});
