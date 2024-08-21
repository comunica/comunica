import { BindingsFactory } from '@comunica/bindings-factory';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import type {
  IActionRdfMetadataAccumulate,
  MediatorRdfMetadataAccumulate,
} from '@comunica/bus-rdf-metadata-accumulate';
import { ActionContext, Bus } from '@comunica/core';
import { MetadataValidationState } from '@comunica/metadata';
import type {
  IActionContext,
  IQueryOperationResultBindings,
  MetadataQuads,
} from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationUnion } from '../lib/ActorQueryOperationUnion';
import '@comunica/jest';
import 'jest-rdf';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

describe('ActorQueryOperationUnion', () => {
  let context: IActionContext;
  let bus: any;
  let mediatorQueryOperation: any;
  let mediatorRdfMetadataAccumulate: MediatorRdfMetadataAccumulate;
  let op3: () => any;
  let op2: () => any;
  let op2Undef: () => any;
  let opq1: () => any;
  let opq2: () => any;
  let opb1: () => any;

  beforeEach(() => {
    context = new ActionContext();
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      async mediate(arg: any) {
        if (arg.operation.type === 'quads') {
          return {
            quadStream: arg.operation.stream,
            metadata: arg.operation.metadata,
            type: 'quads',
          };
        }
        if (arg.operation.type === 'boolean') {
          return {
            type: 'boolean',
          };
        }
        return {
          bindingsStream: arg.operation.stream,
          metadata: arg.operation.metadata,
          type: 'bindings',
          variables: arg.operation.variables,
          canContainUndefs: arg.operation.canContainUndefs,
        };
      },
    };
    mediatorRdfMetadataAccumulate = <any> {
      async mediate(action: IActionRdfMetadataAccumulate) {
        if (action.mode === 'initialize') {
          return { metadata: { cardinality: { type: 'exact', value: 0 }, canContainUndefs: false }};
        }

        const metadata = { ...action.accumulatedMetadata };
        const subMetadata = action.appendingMetadata;
        if (!subMetadata.cardinality || !Number.isFinite(subMetadata.cardinality.value)) {
          // We're already at infinite, so ignore any later metadata
          metadata.cardinality.type = 'estimate';
          metadata.cardinality.value = Number.POSITIVE_INFINITY;
        } else {
          if (subMetadata.cardinality.type === 'estimate') {
            metadata.cardinality.type = 'estimate';
          }
          metadata.cardinality.value += subMetadata.cardinality.value;
        }
        if (metadata.requestTime ?? subMetadata.requestTime) {
          metadata.requestTime = metadata.requestTime ?? 0;
          subMetadata.requestTime = subMetadata.requestTime ?? 0;
          metadata.requestTime += subMetadata.requestTime;
        }
        if (metadata.pageSize ?? subMetadata.pageSize) {
          metadata.pageSize = metadata.pageSize ?? 0;
          subMetadata.pageSize = subMetadata.pageSize ?? 0;
          metadata.pageSize += subMetadata.pageSize;
        }
        if (subMetadata.canContainUndefs) {
          metadata.canContainUndefs = true;
        }

        return { metadata };
      },
    };
    op3 = () => ({
      metadata: () => Promise.resolve({
        state: new MetadataValidationState(),
        cardinality: { type: 'estimate', value: 3 },
        canContainUndefs: false,
        variables: [ DF.variable('a') ],
      }),
      stream: new ArrayIterator([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ], { autoStart: false }),
      type: 'bindings',
    });
    op2 = () => ({
      metadata: () => Promise.resolve({
        state: new MetadataValidationState(),
        cardinality: { type: 'estimate', value: 2 },
        canContainUndefs: false,
        variables: [ DF.variable('b') ],
      }),
      stream: new ArrayIterator([
        BF.bindings([[ DF.variable('b'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('b'), DF.literal('2') ]]),
      ], { autoStart: false }),
      type: 'bindings',
    });
    op2Undef = () => ({
      metadata: () => Promise.resolve({
        state: new MetadataValidationState(),
        cardinality: { type: 'estimate', value: 2 },
        canContainUndefs: true,
        variables: [ DF.variable('b') ],
      }),
      stream: new ArrayIterator([
        BF.bindings([[ DF.variable('b'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('b'), DF.literal('2') ]]),
      ]),
      type: 'bindings',
    });
    opq1 = () => ({
      metadata: () => Promise.resolve({
        state: new MetadataValidationState(),
        cardinality: { type: 'estimate', value: 2 },
      }),
      stream: new ArrayIterator([
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
        DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
      ], { autoStart: false }),
      type: 'quads',
    });
    opq2 = () => ({
      metadata: () => Promise.resolve({
        state: new MetadataValidationState(),
        cardinality: { type: 'estimate', value: 2 },
      }),
      stream: new ArrayIterator([
        DF.quad(DF.namedNode('s3'), DF.namedNode('p3'), DF.namedNode('o3')),
        DF.quad(DF.namedNode('s4'), DF.namedNode('p4'), DF.namedNode('o4')),
      ], { autoStart: false }),
      type: 'quads',
    });
    opb1 = () => ({
      type: 'boolean',
    });
  });

  describe('The ActorQueryOperationUnion module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationUnion).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationUnion constructor', () => {
      expect(new (<any> ActorQueryOperationUnion)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationUnion);
      expect(new (<any> ActorQueryOperationUnion)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationUnion objects without \'new\'', () => {
      expect(() => {
        (<any> ActorQueryOperationUnion)();
      }).toThrow(`Class constructor ActorQueryOperationUnion cannot be invoked without 'new'`);
    });
  });

  describe('ActorQueryOperationUnion#unionVariables', () => {
    it('should return an empty array for an empty input', () => {
      expect(ActorQueryOperationUnion.unionVariables([])).toEqual([]);
    });

    it('should return an empty array for empty inputs', () => {
      expect(ActorQueryOperationUnion.unionVariables([[], [], []])).toEqual([]);
    });

    it('should return a for a single input a', () => {
      expect(ActorQueryOperationUnion.unionVariables([[ DF.variable('a') ]]))
        .toEqual([ DF.variable('a') ]);
    });

    it('should return a for a inputs a and a', () => {
      expect(ActorQueryOperationUnion.unionVariables([[ DF.variable('a') ], [ DF.variable('a') ]]))
        .toEqual([ DF.variable('a') ]);
    });

    it('should return a and b for a inputs a, b and a', () => {
      expect(ActorQueryOperationUnion.unionVariables([
        [ DF.variable('a'), DF.variable('b') ],
        [ DF.variable('a') ],
      ]))
        .toEqual([ DF.variable('a'), DF.variable('b') ]);
    });

    it('should return a and b for a inputs a, b and a, b', () => {
      expect(ActorQueryOperationUnion.unionVariables([
        [ DF.variable('a'), DF.variable('b') ],
        [ DF.variable('a'), DF.variable('b') ],
      ]))
        .toEqual([ DF.variable('a'), DF.variable('b') ]);
    });

    it('should return a, b and c for a inputs a, b and a, b, c', () => {
      expect(ActorQueryOperationUnion.unionVariables([
        [ DF.variable('a'), DF.variable('b') ],
        [ DF.variable('a'), DF.variable('b'), DF.variable('c') ],
      ]))
        .toEqual([ DF.variable('a'), DF.variable('b'), DF.variable('c') ]);
    });

    it('should return a, b and c for a inputs a, b and a, b, c and empty', () => {
      expect(ActorQueryOperationUnion.unionVariables([
        [ DF.variable('a'), DF.variable('b') ],
        [ DF.variable('a'), DF.variable('b'), DF.variable('c') ],
        [],
      ]))
        .toEqual([ DF.variable('a'), DF.variable('b'), DF.variable('c') ]);
    });
  });

  describe('ActorQueryOperationUnion#unionMetadata', () => {
    it('should return 0 items for an empty input', async() => {
      await expect(ActorQueryOperationUnion.unionMetadata([], false, context, mediatorRdfMetadataAccumulate)).resolves
        .toMatchObject({ cardinality: { type: 'exact', value: 0 }, canContainUndefs: false });
    });

    it('should return 1 items for a single input with 1', async() => {
      await expect(ActorQueryOperationUnion.unionMetadata([{
        state: new MetadataValidationState(),
        cardinality: { type: 'estimate', value: 1 },
        canContainUndefs: false,
      }], false, context, mediatorRdfMetadataAccumulate)).resolves
        .toMatchObject({ cardinality: { type: 'estimate', value: 1 }, canContainUndefs: false });
    });

    it('should return 0 items for a single input with 0', async() => {
      await expect(ActorQueryOperationUnion.unionMetadata([{
        state: new MetadataValidationState(),
        cardinality: { type: 'estimate', value: 0 },
        canContainUndefs: false,
      }], false, context, mediatorRdfMetadataAccumulate)).resolves
        .toMatchObject({ cardinality: { type: 'estimate', value: 0 }, canContainUndefs: false });
    });

    it('should return infinite items for a single input with Infinity', async() => {
      await expect(ActorQueryOperationUnion.unionMetadata([
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },
          canContainUndefs: false,
        },
      ], false, context, mediatorRdfMetadataAccumulate)).resolves.toMatchObject(
        { cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }, canContainUndefs: false },
      );
    });

    it('should return 3 items for inputs with 1 and 2 as estimate', async() => {
      await expect(ActorQueryOperationUnion.unionMetadata([
        { state: new MetadataValidationState(), cardinality: { type: 'estimate', value: 1 }, canContainUndefs: false },
        { state: new MetadataValidationState(), cardinality: { type: 'estimate', value: 2 }, canContainUndefs: false },
      ], false, context, mediatorRdfMetadataAccumulate)).resolves
        .toMatchObject({ cardinality: { type: 'estimate', value: 3 }, canContainUndefs: false });
    });

    it('should return 3 items for inputs with 1 and 2 as exact', async() => {
      await expect(ActorQueryOperationUnion.unionMetadata([
        { state: new MetadataValidationState(), cardinality: { type: 'exact', value: 1 }, canContainUndefs: false },
        { state: new MetadataValidationState(), cardinality: { type: 'exact', value: 2 }, canContainUndefs: false },
      ], false, context, mediatorRdfMetadataAccumulate)).resolves
        .toMatchObject({ cardinality: { type: 'exact', value: 3 }, canContainUndefs: false });
    });

    it('should return 3 items for inputs with 1 and 2 as exact and estimate', async() => {
      await expect(ActorQueryOperationUnion.unionMetadata([
        { state: new MetadataValidationState(), cardinality: { type: 'exact', value: 1 }, canContainUndefs: false },
        { state: new MetadataValidationState(), cardinality: { type: 'estimate', value: 2 }, canContainUndefs: false },
      ], false, context, mediatorRdfMetadataAccumulate)).resolves
        .toMatchObject({ cardinality: { type: 'estimate', value: 3 }, canContainUndefs: false });
    });

    it('should return infinite items for inputs with Infinity and 2', async() => {
      await expect(ActorQueryOperationUnion
        .unionMetadata([
          {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },
            canContainUndefs: false,
          },
          {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: 2 },
            canContainUndefs: false,
          },
        ], false, context, mediatorRdfMetadataAccumulate)).resolves.toMatchObject(
        { cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }, canContainUndefs: false },
      );
    });

    it('should return infinite items for inputs with 1 and Infinity', async() => {
      await expect(ActorQueryOperationUnion
        .unionMetadata([
          {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: 1 },
            canContainUndefs: false,
          },
          {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },
            canContainUndefs: false,
          },
        ], false, context, mediatorRdfMetadataAccumulate)).resolves.toMatchObject(
        { cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }, canContainUndefs: false },
      );
    });

    it('should return infinite items for inputs with Infinity and Infinity', async() => {
      await expect(ActorQueryOperationUnion
        .unionMetadata([
          {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },
            canContainUndefs: false,
          },
          {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },
            canContainUndefs: false,
          },
        ], false, context, mediatorRdfMetadataAccumulate)).resolves.toMatchObject(
        { cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }, canContainUndefs: false },
      );
    });

    it('should union variables if bindings is true', async() => {
      await expect(ActorQueryOperationUnion.unionMetadata([
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 1 },
          canContainUndefs: false,
          variables: [ DF.variable('a') ],
        },
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 2 },
          canContainUndefs: false,
          variables: [ DF.variable('a'), DF.variable('b') ],
        },
      ], true, context, mediatorRdfMetadataAccumulate)).resolves
        .toMatchObject({
          cardinality: { type: 'estimate', value: 3 },
          canContainUndefs: false,
          variables: [ DF.variable('a'), DF.variable('b') ],
        });
    });

    it('should become invalid once a sub-metadata becomes invalid', async() => {
      const metadatas: MetadataQuads[] = [
        { state: new MetadataValidationState(), cardinality: { type: 'estimate', value: 1 }, canContainUndefs: false },
        { state: new MetadataValidationState(), cardinality: { type: 'estimate', value: 2 }, canContainUndefs: false },
      ];

      const metadata = await ActorQueryOperationUnion
        .unionMetadata(metadatas, false, context, mediatorRdfMetadataAccumulate);
      const invalidListener = jest.fn();
      metadata.state.addInvalidateListener(invalidListener);
      expect(metadata.state.valid).toBeTruthy();

      metadatas[0].state.invalidate();
      expect(metadata.state.valid).toBeFalsy();
      expect(invalidListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('An ActorQueryOperationUnion instance', () => {
    let actor: ActorQueryOperationUnion;

    beforeEach(() => {
      actor = new ActorQueryOperationUnion(
        { name: 'actor', bus, mediatorQueryOperation, mediatorRdfMetadataAccumulate },
      );
    });

    it('should test on union', async() => {
      const input = [ op3(), op2() ];
      await expect(actor.test(<any> {
        operation: { type: 'union', input, context: new ActionContext() },
      })).resolves.toBeTruthy();
      for (const op of input) {
        op.stream.destroy();
      }
    });

    it('should not test on non-union', async() => {
      const input = [ op3(), op2() ];
      await expect(actor.test(<any> {
        operation: { type: 'some-other-type', input },
        context: new ActionContext(),
      })).rejects.toBeTruthy();
      for (const op of input) {
        op.stream.destroy();
      }
    });

    it('should run on zero bindings streams', async() => {
      const op: any = { operation: { type: 'union', input: []}, context: new ActionContext() };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      await expect(output.metadata()).resolves.toMatchObject({
        cardinality: { type: 'exact', value: 0 },
        canContainUndefs: false,
        variables: [],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([]);
    });

    it('should run on two bindings streams', async() => {
      const op: any = { operation: { type: 'union', input: [ op3(), op2() ]}, context: new ActionContext() };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      await expect(output.metadata()).resolves.toMatchObject({
        cardinality: { type: 'estimate', value: 5 },
        canContainUndefs: false,
        variables: [ DF.variable('a'), DF.variable('b') ],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('b'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('b'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]);
    });

    it('should run on three bindings streams', async() => {
      const output = ActorQueryOperation.getSafeBindings(await actor.run(<any> {
        operation: { type: 'union', input: [ op3(), op2(), op2Undef() ]},
        context: new ActionContext(),
      }));
      await expect(output.metadata()).resolves.toEqual({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'estimate', value: 7 },
        canContainUndefs: true,
        variables: [ DF.variable('a'), DF.variable('b') ],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('b'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('b'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('b'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('b'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]);
    });

    it('should run with a right bindings stream with undefs', async() => {
      const op: any = { operation: { type: 'union', input: [ op3(), op2Undef() ]}, context: new ActionContext() };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      await expect(output.metadata()).resolves.toMatchObject({
        cardinality: { type: 'estimate', value: 5 },
        canContainUndefs: true,
        variables: [ DF.variable('a'), DF.variable('b') ],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('b'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('b'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]);
    });

    it('should run on two bindings streams with metadata invalidation', async() => {
      // An operation in which we can access the metadata state
      const state = new MetadataValidationState();
      const opCustom = {
        metadata: () => Promise.resolve({
          state,
          cardinality: { type: 'estimate', value: 3 },
          canContainUndefs: false,
          variables: [ DF.variable('a') ],
        }),
        stream: new ArrayIterator([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ], { autoStart: false }),
        type: 'bindings',
      };

      // Execute the operation, and expect a valid metadata
      const op: any = { operation: { type: 'union', input: [ op3(), opCustom ]}, context: new ActionContext() };
      const output: IQueryOperationResultBindings = <any> await actor.run(op);
      const outputMetadata = await output.metadata();
      expect(outputMetadata).toMatchObject({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'estimate', value: 6 },
        canContainUndefs: false,
        variables: [ DF.variable('a') ],
      });

      // After invoking this, we expect the returned metadata to also be invalidated
      state.invalidate();
      expect(outputMetadata.state.valid).toBeFalsy();

      // We can request a new metadata object, which will be valid again.
      const outputMetadata2 = await output.metadata();
      expect(outputMetadata2).toMatchObject({
        state: { valid: true },
        cardinality: { type: 'estimate', value: 6 },
        canContainUndefs: false,
        variables: [ DF.variable('a') ],
      });
    });

    it('should run on two quad streams', async() => {
      const op: any = { operation: { type: 'union', input: [ opq1(), opq2() ]}, context: new ActionContext() };
      const output = ActorQueryOperation.getSafeQuads(await actor.run(op));
      await expect(output.metadata()).resolves.toMatchObject({
        cardinality: { type: 'estimate', value: 4 },
      });
      expect(output.type).toBe('quads');
      await expect(output.quadStream.toArray()).resolves.toBeRdfIsomorphic([
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
        DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
        DF.quad(DF.namedNode('s3'), DF.namedNode('p3'), DF.namedNode('o3')),
        DF.quad(DF.namedNode('s4'), DF.namedNode('p4'), DF.namedNode('o4')),
      ]);
    });

    it('should throw on different stream types', async() => {
      const op: any = { operation: { type: 'union', input: [ op2(), opq2() ]}, context: new ActionContext() };
      await expect(actor.run(op)).rejects.toThrow(`Unable to union bindings and quads`);
    });

    it('should throw on unsupported stream types', async() => {
      const op: any = { operation: { type: 'union', input: [ opb1() ]}, context: new ActionContext() };
      await expect(actor.run(op)).rejects.toThrow(`Unable to union boolean`);
    });
  });
});
