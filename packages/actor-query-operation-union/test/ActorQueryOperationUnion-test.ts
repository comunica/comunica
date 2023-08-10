import { BindingsFactory } from '@comunica/bindings-factory';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { ActionContext, Bus } from '@comunica/core';
import { MetadataValidationState } from '@comunica/metadata';
import type { IQueryOperationResultBindings } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationUnion } from '../lib/ActorQueryOperationUnion';
import '@comunica/jest';

const DF = new DataFactory();
const BF = new BindingsFactory(undefined, {});

describe('ActorQueryOperationUnion', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let op3: () => any;
  let op2: () => any;
  let op2Undef: () => any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: arg.operation.stream,
        metadata: arg.operation.metadata,
        type: 'bindings',
        variables: arg.operation.variables,
        canContainUndefs: arg.operation.canContainUndefs,
      }),
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
      expect(() => { (<any> ActorQueryOperationUnion)(); }).toThrow();
    });
  });

  describe('ActorQueryOperationUnion#unionVariables', () => {
    it('should return an empty array for an empty input', () => {
      return expect(ActorQueryOperationUnion.unionVariables([])).toEqual([]);
    });

    it('should return an empty array for empty inputs', () => {
      return expect(ActorQueryOperationUnion.unionVariables([[], [], []])).toEqual([]);
    });

    it('should return a for a single input a', () => {
      return expect(ActorQueryOperationUnion.unionVariables([[ DF.variable('a') ]]))
        .toEqual([ DF.variable('a') ]);
    });

    it('should return a for a inputs a and a', () => {
      return expect(ActorQueryOperationUnion.unionVariables([[ DF.variable('a') ], [ DF.variable('a') ]]))
        .toEqual([ DF.variable('a') ]);
    });

    it('should return a and b for a inputs a, b and a', () => {
      return expect(ActorQueryOperationUnion.unionVariables([
        [ DF.variable('a'), DF.variable('b') ],
        [ DF.variable('a') ],
      ]))
        .toEqual([ DF.variable('a'), DF.variable('b') ]);
    });

    it('should return a and b for a inputs a, b and a, b', () => {
      return expect(ActorQueryOperationUnion.unionVariables([
        [ DF.variable('a'), DF.variable('b') ],
        [ DF.variable('a'), DF.variable('b') ],
      ]))
        .toEqual([ DF.variable('a'), DF.variable('b') ]);
    });

    it('should return a, b and c for a inputs a, b and a, b, c', () => {
      return expect(ActorQueryOperationUnion.unionVariables([
        [ DF.variable('a'), DF.variable('b') ],
        [ DF.variable('a'), DF.variable('b'), DF.variable('c') ],
      ]))
        .toEqual([ DF.variable('a'), DF.variable('b'), DF.variable('c') ]);
    });

    it('should return a, b and c for a inputs a, b and a, b, c and empty', () => {
      return expect(ActorQueryOperationUnion.unionVariables([
        [ DF.variable('a'), DF.variable('b') ],
        [ DF.variable('a'), DF.variable('b'), DF.variable('c') ],
        [],
      ]))
        .toEqual([ DF.variable('a'), DF.variable('b'), DF.variable('c') ]);
    });
  });

  describe('ActorQueryOperationUnion#unionMetadata', () => {
    it('should return 0 items for an empty input', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([], false))
        .toMatchObject({ cardinality: { type: 'exact', value: 0 }, canContainUndefs: false });
    });

    it('should return 1 items for a single input with 1', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([
        { state: new MetadataValidationState(), cardinality: { type: 'estimate', value: 1 }, canContainUndefs: false },
      ], false))
        .toMatchObject({ cardinality: { type: 'estimate', value: 1 }, canContainUndefs: false });
    });

    it('should return 0 items for a single input with 0', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([
        { state: new MetadataValidationState(), cardinality: { type: 'estimate', value: 0 }, canContainUndefs: false },
      ], false))
        .toMatchObject({ cardinality: { type: 'estimate', value: 0 }, canContainUndefs: false });
    });

    it('should return infinite items for a single input with Infinity', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },
          canContainUndefs: false,
        },
      ], false))
        .toMatchObject({ cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }, canContainUndefs: false });
    });

    it('should return 3 items for inputs with 1 and 2 as estimate', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([
        { state: new MetadataValidationState(), cardinality: { type: 'estimate', value: 1 }, canContainUndefs: false },
        { state: new MetadataValidationState(), cardinality: { type: 'estimate', value: 2 }, canContainUndefs: false },
      ], false))
        .toMatchObject({ cardinality: { type: 'estimate', value: 3 }, canContainUndefs: false });
    });

    it('should return 3 items for inputs with 1 and 2 as exact', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([
        { state: new MetadataValidationState(), cardinality: { type: 'exact', value: 1 }, canContainUndefs: false },
        { state: new MetadataValidationState(), cardinality: { type: 'exact', value: 2 }, canContainUndefs: false },
      ], false))
        .toMatchObject({ cardinality: { type: 'exact', value: 3 }, canContainUndefs: false });
    });

    it('should return 3 items for inputs with 1 and 2 as exact and estimate', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([
        { state: new MetadataValidationState(), cardinality: { type: 'exact', value: 1 }, canContainUndefs: false },
        { state: new MetadataValidationState(), cardinality: { type: 'estimate', value: 2 }, canContainUndefs: false },
      ], false))
        .toMatchObject({ cardinality: { type: 'estimate', value: 3 }, canContainUndefs: false });
    });

    it('should return infinite items for inputs with Infinity and 2', () => {
      return expect(ActorQueryOperationUnion
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
        ], false))
        .toMatchObject({ cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }, canContainUndefs: false });
    });

    it('should return infinite items for inputs with 1 and Infinity', () => {
      return expect(ActorQueryOperationUnion
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
        ], false))
        .toMatchObject({ cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }, canContainUndefs: false });
    });

    it('should return infinite items for inputs with Infinity and Infinity', () => {
      return expect(ActorQueryOperationUnion
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
        ], false))
        .toMatchObject({ cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }, canContainUndefs: false });
    });

    it('should union variables if bindings is true', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([
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
      ], true))
        .toMatchObject({
          cardinality: { type: 'estimate', value: 3 },
          canContainUndefs: false,
          variables: [ DF.variable('a'), DF.variable('b') ],
        });
    });
  });

  describe('An ActorQueryOperationUnion instance', () => {
    let actor: ActorQueryOperationUnion;

    beforeEach(() => {
      actor = new ActorQueryOperationUnion({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on union', async() => {
      const input = [ op3(), op2() ];
      await expect(actor.test(<any> {
        operation: { type: 'union', input, context: new ActionContext() },
      })).resolves.toBeTruthy();
      input.forEach(op => op.stream.destroy());
    });

    it('should not test on non-union', async() => {
      const input = [ op3(), op2() ];
      await expect(actor.test(<any> {
        operation: { type: 'some-other-type', input },
        context: new ActionContext(),
      })).rejects.toBeTruthy();
      input.forEach(op => op.stream.destroy());
    });

    it('should run on two streams', () => {
      const op: any = { operation: { type: 'union', input: [ op3(), op2() ]}, context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata()).toMatchObject({
          cardinality: { type: 'estimate', value: 5 },
          canContainUndefs: false,
          variables: [ DF.variable('a'), DF.variable('b') ],
        });
        expect(output.type).toEqual('bindings');
        await expect(output.bindingsStream).toEqualBindingsStream([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('b'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('b'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ]);
      });
    });

    it('should run on three streams', () => {
      return actor.run(<any> {
        operation: { type: 'union', input: [ op3(), op2(), op2Undef() ]},
        context: new ActionContext(),
      }).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata()).toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: 7 },
          canContainUndefs: true,
          variables: [ DF.variable('a'), DF.variable('b') ],
        });
        expect(output.type).toEqual('bindings');
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
    });

    it('should run with a right stream with undefs', () => {
      const op: any = { operation: { type: 'union', input: [ op3(), op2Undef() ]}, context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata()).toMatchObject({
          cardinality: { type: 'estimate', value: 5 },
          canContainUndefs: true,
          variables: [ DF.variable('a'), DF.variable('b') ],
        });
        expect(output.type).toEqual('bindings');
        await expect(output.bindingsStream).toEqualBindingsStream([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('b'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('b'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ]);
      });
    });

    it('should run on two streams with metadata invalidation', async() => {
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
  });
});
