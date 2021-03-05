import { ActorQueryOperation, Bindings } from '@comunica/bus-query-operation';
import { Bus } from '@comunica/core';
import type { IActorQueryOperationOutputBindings } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationUnion } from '../lib/ActorQueryOperationUnion';
const arrayifyStream = require('arrayify-stream');
const DF = new DataFactory();

describe('ActorQueryOperationUnion', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let left: any;
  let leftNoMeta: any;
  let right: any;
  let rightUndef: any;

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
    left = {
      metadata: () => Promise.resolve({ totalItems: 3 }),
      stream: new ArrayIterator([
        Bindings({ a: DF.literal('1') }),
        Bindings({ a: DF.literal('2') }),
        Bindings({ a: DF.literal('3') }),
      ]),
      type: 'bindings',
      variables: [ 'a' ],
      canContainUndefs: false,
    };
    leftNoMeta = {
      metadata: null,
      stream: new ArrayIterator([
        Bindings({ a: DF.literal('1') }),
        Bindings({ a: DF.literal('2') }),
        Bindings({ a: DF.literal('3') }),
      ]),
      type: 'bindings',
      variables: [ 'a' ],
      canContainUndefs: false,
    };
    right = {
      metadata: () => Promise.resolve({ totalItems: 2 }),
      stream: new ArrayIterator([
        Bindings({ b: DF.literal('1') }),
        Bindings({ b: DF.literal('2') }),
      ]),
      type: 'bindings',
      variables: [ 'b' ],
      canContainUndefs: false,
    };
    rightUndef = {
      metadata: () => Promise.resolve({ totalItems: 2 }),
      stream: new ArrayIterator([
        Bindings({ b: DF.literal('1') }),
        Bindings({ b: DF.literal('2') }),
      ]),
      type: 'bindings',
      variables: [ 'b' ],
      canContainUndefs: true,
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
      return expect(ActorQueryOperationUnion.unionVariables([[ 'a' ]])).toEqual([ 'a' ]);
    });

    it('should return a for a inputs a and a', () => {
      return expect(ActorQueryOperationUnion.unionVariables([[ 'a' ], [ 'a' ]])).toEqual([ 'a' ]);
    });

    it('should return a and b for a inputs a, b and a', () => {
      return expect(ActorQueryOperationUnion.unionVariables([[ 'a', 'b' ], [ 'a' ]])).toEqual([ 'a', 'b' ]);
    });

    it('should return a and b for a inputs a, b and a, b', () => {
      return expect(ActorQueryOperationUnion.unionVariables([[ 'a', 'b' ], [ 'a', 'b' ]])).toEqual([ 'a', 'b' ]);
    });

    it('should return a, b and c for a inputs a, b and a, b, c', () => {
      return expect(ActorQueryOperationUnion.unionVariables([[ 'a', 'b' ], [ 'a', 'b', 'c' ]]))
        .toEqual([ 'a', 'b', 'c' ]);
    });

    it('should return a, b and c for a inputs a, b and a, b, c and empty', () => {
      return expect(ActorQueryOperationUnion.unionVariables([[ 'a', 'b' ], [ 'a', 'b', 'c' ], []]))
        .toEqual([ 'a', 'b', 'c' ]);
    });
  });

  describe('ActorQueryOperationUnion#unionMetadata', () => {
    it('should return 0 items for an empty input', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([])).toEqual({ totalItems: 0 });
    });

    it('should return 1 items for a single input with 1', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([{ totalItems: 1 }])).toEqual({ totalItems: 1 });
    });

    it('should return infinite items for a single input with Infinity', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([{ totalItems: Number.POSITIVE_INFINITY }]))
        .toEqual({ totalItems: Number.POSITIVE_INFINITY });
    });

    it('should return infinite items for a single empty input', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([{}]))
        .toEqual({ totalItems: Number.POSITIVE_INFINITY });
    });

    it('should return infinite items for a single input without items', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([{ something: 'abc' }]))
        .toEqual({ totalItems: Number.POSITIVE_INFINITY });
    });

    it('should return 3 items for inputs with 1 and 2', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([{ totalItems: 1 }, { totalItems: 2 }]))
        .toEqual({ totalItems: 3 });
    });

    it('should return infinite items for inputs with Infinity and 2', () => {
      return expect(ActorQueryOperationUnion
        .unionMetadata([{ totalItems: Number.POSITIVE_INFINITY }, { totalItems: 2 }]))
        .toEqual({ totalItems: Number.POSITIVE_INFINITY });
    });

    it('should return infinite items for inputs with 1 and Infinity', () => {
      return expect(ActorQueryOperationUnion
        .unionMetadata([{ totalItems: 1 }, { totalItems: Number.POSITIVE_INFINITY }]))
        .toEqual({ totalItems: Number.POSITIVE_INFINITY });
    });

    it('should return infinite items for inputs with Infinity and Infinity', () => {
      return expect(ActorQueryOperationUnion
        .unionMetadata([{ totalItems: Number.POSITIVE_INFINITY }, { totalItems: Number.POSITIVE_INFINITY }]))
        .toEqual({ totalItems: Number.POSITIVE_INFINITY });
    });

    it('should return infinite items for inputs with empty and 2', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([{}, { totalItems: 2 }]))
        .toEqual({ totalItems: Number.POSITIVE_INFINITY });
    });

    it('should return infinite items for inputs with 1 and empty', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([{ totalItems: 1 }, {}]))
        .toEqual({ totalItems: Number.POSITIVE_INFINITY });
    });

    it('should return infinite items for inputs with empty and empty', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([{}, {}]))
        .toEqual({ totalItems: Number.POSITIVE_INFINITY });
    });
  });

  describe('An ActorQueryOperationUnion instance', () => {
    let actor: ActorQueryOperationUnion;

    beforeEach(() => {
      actor = new ActorQueryOperationUnion({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on union', () => {
      const op = { operation: { type: 'union', left, right }};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-union', () => {
      const op = { operation: { type: 'some-other-type', left, right }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', () => {
      const op = { operation: { type: 'union', left, right }};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await (<any> output).metadata()).toEqual({ totalItems: 5 });
        expect(output.variables).toEqual([ 'a', 'b' ]);
        expect(output.type).toEqual('bindings');
        expect(output.canContainUndefs).toEqual(false);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: DF.literal('1') }),
          Bindings({ b: DF.literal('1') }),
          Bindings({ a: DF.literal('2') }),
          Bindings({ b: DF.literal('2') }),
          Bindings({ a: DF.literal('3') }),
        ]);
      });
    });

    it('should run with a left stream without metadata', () => {
      const op = { operation: { type: 'union', left: leftNoMeta, right }};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(output.metadata).toBeFalsy();
        expect(output.variables).toEqual([ 'a', 'b' ]);
        expect(output.type).toEqual('bindings');
        expect(output.canContainUndefs).toEqual(false);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: DF.literal('1') }),
          Bindings({ b: DF.literal('1') }),
          Bindings({ a: DF.literal('2') }),
          Bindings({ b: DF.literal('2') }),
          Bindings({ a: DF.literal('3') }),
        ]);
      });
    });

    it('should run with a right stream with undefs', () => {
      const op = { operation: { type: 'union', left, right: rightUndef }};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await (<any> output).metadata()).toEqual({ totalItems: 5 });
        expect(output.variables).toEqual([ 'a', 'b' ]);
        expect(output.type).toEqual('bindings');
        expect(output.canContainUndefs).toEqual(true);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: DF.literal('1') }),
          Bindings({ b: DF.literal('1') }),
          Bindings({ a: DF.literal('2') }),
          Bindings({ b: DF.literal('2') }),
          Bindings({ a: DF.literal('3') }),
        ]);
      });
    });
  });
});
