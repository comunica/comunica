import { BindingsFactory } from '@comunica/bindings-factory';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { ActionContext, Bus } from '@comunica/core';
import type { IQueryOperationResultBindings } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationUnion } from '../lib/ActorQueryOperationUnion';
import '@comunica/jest';

const DF = new DataFactory();
const BF = new BindingsFactory();

describe('ActorQueryOperationUnion', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let op3: any;
  let op2: any;
  let op2Undef: any;

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
    op3 = {
      metadata: () => Promise.resolve({
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
    op2 = {
      metadata: () => Promise.resolve({
        cardinality: { type: 'estimate', value: 2 },
        canContainUndefs: false,
        variables: [ DF.variable('b') ],
      }),
      stream: new ArrayIterator([
        BF.bindings([[ DF.variable('b'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('b'), DF.literal('2') ]]),
      ], { autoStart: false }),
      type: 'bindings',
    };
    op2Undef = {
      metadata: () => Promise.resolve({
        cardinality: { type: 'estimate', value: 2 },
        canContainUndefs: true,
        variables: [ DF.variable('b') ],
      }),
      stream: new ArrayIterator([
        BF.bindings([[ DF.variable('b'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('b'), DF.literal('2') ]]),
      ]),
      type: 'bindings',
    };
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
        .toEqual({ cardinality: { type: 'exact', value: 0 }, canContainUndefs: false });
    });

    it('should return 1 items for a single input with 1', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([
        { cardinality: { type: 'estimate', value: 1 }, canContainUndefs: false },
      ], false))
        .toEqual({ cardinality: { type: 'estimate', value: 1 }, canContainUndefs: false });
    });

    it('should return 0 items for a single input with 0', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([
        { cardinality: { type: 'estimate', value: 0 }, canContainUndefs: false },
      ], false))
        .toEqual({ cardinality: { type: 'estimate', value: 0 }, canContainUndefs: false });
    });

    it('should return infinite items for a single input with Infinity', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([
        { cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }, canContainUndefs: false },
      ], false))
        .toEqual({ cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }, canContainUndefs: false });
    });

    it('should return 3 items for inputs with 1 and 2 as estimate', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([
        { cardinality: { type: 'estimate', value: 1 }, canContainUndefs: false },
        { cardinality: { type: 'estimate', value: 2 }, canContainUndefs: false },
      ], false))
        .toEqual({ cardinality: { type: 'estimate', value: 3 }, canContainUndefs: false });
    });

    it('should return 3 items for inputs with 1 and 2 as exact', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([
        { cardinality: { type: 'exact', value: 1 }, canContainUndefs: false },
        { cardinality: { type: 'exact', value: 2 }, canContainUndefs: false },
      ], false))
        .toEqual({ cardinality: { type: 'exact', value: 3 }, canContainUndefs: false });
    });

    it('should return 3 items for inputs with 1 and 2 as exact and estimate', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([
        { cardinality: { type: 'exact', value: 1 }, canContainUndefs: false },
        { cardinality: { type: 'estimate', value: 2 }, canContainUndefs: false },
      ], false))
        .toEqual({ cardinality: { type: 'estimate', value: 3 }, canContainUndefs: false });
    });

    it('should return infinite items for inputs with Infinity and 2', () => {
      return expect(ActorQueryOperationUnion
        .unionMetadata([
          { cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }, canContainUndefs: false },
          { cardinality: { type: 'estimate', value: 2 }, canContainUndefs: false },
        ], false))
        .toEqual({ cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }, canContainUndefs: false });
    });

    it('should return infinite items for inputs with 1 and Infinity', () => {
      return expect(ActorQueryOperationUnion
        .unionMetadata([
          { cardinality: { type: 'estimate', value: 1 }, canContainUndefs: false },
          { cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }, canContainUndefs: false },
        ], false))
        .toEqual({ cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }, canContainUndefs: false });
    });

    it('should return infinite items for inputs with Infinity and Infinity', () => {
      return expect(ActorQueryOperationUnion
        .unionMetadata([
          { cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }, canContainUndefs: false },
          { cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }, canContainUndefs: false },
        ], false))
        .toEqual({ cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }, canContainUndefs: false });
    });

    it('should union variables if bindings is true', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([
        { cardinality: { type: 'estimate', value: 1 }, canContainUndefs: false, variables: [ DF.variable('a') ]},
        {
          cardinality: { type: 'estimate', value: 2 },
          canContainUndefs: false,
          variables: [ DF.variable('a'), DF.variable('b') ],
        },
      ], true))
        .toEqual({
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

    it('should test on union', () => {
      const op: any = { operation: { type: 'union', input: [ op3, op2 ]}};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-union', () => {
      const op: any = { operation: { type: 'some-other-type', input: [ op3, op2 ]}, context: new ActionContext() };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run on two streams', () => {
      const op: any = { operation: { type: 'union', input: [ op3, op2 ]}, context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata()).toEqual({
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
      const op: any = { operation: { type: 'union', input: [ op3, op2, op2Undef ]}, context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata()).toEqual({
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
      const op: any = { operation: { type: 'union', input: [ op3, op2Undef ]}, context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata()).toEqual({
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
  });
});
