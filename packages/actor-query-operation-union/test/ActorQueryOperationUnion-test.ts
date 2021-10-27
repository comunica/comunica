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
      metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false }),
      stream: new ArrayIterator([
        Bindings({ a: DF.literal('1') }),
        Bindings({ a: DF.literal('2') }),
        Bindings({ a: DF.literal('3') }),
      ], { autoStart: false }),
      type: 'bindings',
      variables: [ 'a' ],
    };
    op2 = {
      metadata: () => Promise.resolve({ cardinality: 2, canContainUndefs: false }),
      stream: new ArrayIterator([
        Bindings({ b: DF.literal('1') }),
        Bindings({ b: DF.literal('2') }),
      ], { autoStart: false }),
      type: 'bindings',
      variables: [ 'b' ],
    };
    op2Undef = {
      metadata: () => Promise.resolve({ cardinality: 2, canContainUndefs: true }),
      stream: new ArrayIterator([
        Bindings({ b: DF.literal('1') }),
        Bindings({ b: DF.literal('2') }),
      ]),
      type: 'bindings',
      variables: [ 'b' ],
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
      return expect(ActorQueryOperationUnion.unionMetadata([]))
        .toEqual({ cardinality: 0, canContainUndefs: false });
    });

    it('should return 1 items for a single input with 1', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([{ cardinality: 1, canContainUndefs: false }]))
        .toEqual({ cardinality: 1, canContainUndefs: false });
    });

    it('should return 0 items for a single input with 0', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([{ cardinality: 0, canContainUndefs: false }]))
        .toEqual({ cardinality: 0, canContainUndefs: false });
    });

    it('should return infinite items for a single input with Infinity', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([
        { cardinality: Number.POSITIVE_INFINITY, canContainUndefs: false },
      ])).toEqual({ cardinality: Number.POSITIVE_INFINITY, canContainUndefs: false });
    });

    it('should return 3 items for inputs with 1 and 2', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([
        { cardinality: 1, canContainUndefs: false },
        { cardinality: 2, canContainUndefs: false },
      ]))
        .toEqual({ cardinality: 3, canContainUndefs: false });
    });

    it('should return infinite items for inputs with Infinity and 2', () => {
      return expect(ActorQueryOperationUnion
        .unionMetadata([
          { cardinality: Number.POSITIVE_INFINITY, canContainUndefs: false },
          { cardinality: 2, canContainUndefs: false },
        ])).toEqual({ cardinality: Number.POSITIVE_INFINITY, canContainUndefs: false });
    });

    it('should return infinite items for inputs with 1 and Infinity', () => {
      return expect(ActorQueryOperationUnion
        .unionMetadata([
          { cardinality: 1, canContainUndefs: false },
          { cardinality: Number.POSITIVE_INFINITY, canContainUndefs: false },
        ])).toEqual({ cardinality: Number.POSITIVE_INFINITY, canContainUndefs: false });
    });

    it('should return infinite items for inputs with Infinity and Infinity', () => {
      return expect(ActorQueryOperationUnion
        .unionMetadata([
          { cardinality: Number.POSITIVE_INFINITY, canContainUndefs: false },
          { cardinality: Number.POSITIVE_INFINITY, canContainUndefs: false },
        ]))
        .toEqual({ cardinality: Number.POSITIVE_INFINITY, canContainUndefs: false });
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
      const op: any = { operation: { type: 'some-other-type', input: [ op3, op2 ]}};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run on two streams', () => {
      const op: any = { operation: { type: 'union', input: [ op3, op2 ]}};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ cardinality: 5, canContainUndefs: false });
        expect(output.variables).toEqual([ 'a', 'b' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: DF.literal('1') }),
          Bindings({ b: DF.literal('1') }),
          Bindings({ a: DF.literal('2') }),
          Bindings({ b: DF.literal('2') }),
          Bindings({ a: DF.literal('3') }),
        ]);
      });
    });

    it('should run on three streams', () => {
      const op: any = { operation: { type: 'union', input: [ op3, op2, op2Undef ]}};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ cardinality: 7, canContainUndefs: true });
        expect(output.variables).toEqual([ 'a', 'b' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: DF.literal('1') }),
          Bindings({ b: DF.literal('1') }),
          Bindings({ b: DF.literal('1') }),
          Bindings({ a: DF.literal('2') }),
          Bindings({ b: DF.literal('2') }),
          Bindings({ b: DF.literal('2') }),
          Bindings({ a: DF.literal('3') }),
        ]);
      });
    });

    it('should run with a right stream with undefs', () => {
      const op: any = { operation: { type: 'union', input: [ op3, op2Undef ]}};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ cardinality: 5, canContainUndefs: true });
        expect(output.variables).toEqual([ 'a', 'b' ]);
        expect(output.type).toEqual('bindings');
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
