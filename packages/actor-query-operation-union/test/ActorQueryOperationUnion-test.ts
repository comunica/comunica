import {ActorQueryOperation, Bindings, IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {literal} from "@rdfjs/data-model";
import {ArrayIterator} from "asynciterator";
import {ActorQueryOperationUnion} from "../lib/ActorQueryOperationUnion";
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationUnion', () => {
  let bus;
  let mediatorQueryOperation;
  let left;
  let leftNoMeta;
  let right;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg) => Promise.resolve({
        bindingsStream: arg.operation.stream,
        metadata: arg.operation.metadata,
        type: 'bindings',
        variables: arg.operation.variables,
      }),
    };
    left = {
      metadata: () => Promise.resolve({ totalItems: 3 }),
      stream: new ArrayIterator([
        Bindings({ a: literal('1') }),
        Bindings({ a: literal('2') }),
        Bindings({ a: literal('3') }),
      ]),
      type: 'bindings',
      variables: [ 'a' ],
    };
    leftNoMeta = {
      metadata: null,
      stream: new ArrayIterator([
        Bindings({ a: literal('1') }),
        Bindings({ a: literal('2') }),
        Bindings({ a: literal('3') }),
      ]),
      type: 'bindings',
      variables: [ 'a' ],
    };
    right = {
      metadata: () => Promise.resolve({ totalItems: 2 }),
      stream: new ArrayIterator([
        Bindings({ b: literal('1') }),
        Bindings({ b: literal('2') }),
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
      return expect(ActorQueryOperationUnion.unionVariables([['a']])).toEqual(['a']);
    });

    it('should return a for a inputs a and a', () => {
      return expect(ActorQueryOperationUnion.unionVariables([['a'], ['a']])).toEqual(['a']);
    });

    it('should return a and b for a inputs a, b and a', () => {
      return expect(ActorQueryOperationUnion.unionVariables([['a', 'b'], ['a']])).toEqual(['a', 'b']);
    });

    it('should return a and b for a inputs a, b and a, b', () => {
      return expect(ActorQueryOperationUnion.unionVariables([['a', 'b'], ['a', 'b']])).toEqual(['a', 'b']);
    });

    it('should return a, b and c for a inputs a, b and a, b, c', () => {
      return expect(ActorQueryOperationUnion.unionVariables([['a', 'b'], ['a', 'b', 'c']])).toEqual(['a', 'b', 'c']);
    });

    it('should return a, b and c for a inputs a, b and a, b, c and empty', () => {
      return expect(ActorQueryOperationUnion.unionVariables([['a', 'b'], ['a', 'b', 'c'], []]))
        .toEqual(['a', 'b', 'c']);
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
      return expect(ActorQueryOperationUnion.unionMetadata([{ totalItems: Infinity }]))
        .toEqual({ totalItems: Infinity });
    });

    it('should return infinite items for a single empty input', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([{}]))
        .toEqual({ totalItems: Infinity });
    });

    it('should return infinite items for a single input without items', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([{ something: 'abc' }]))
        .toEqual({ totalItems: Infinity });
    });

    it('should return 3 items for inputs with 1 and 2', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([{ totalItems: 1 }, { totalItems: 2 }]))
        .toEqual({ totalItems: 3 });
    });

    it('should return infinite items for inputs with Infinity and 2', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([{ totalItems: Infinity }, { totalItems: 2 }]))
        .toEqual({ totalItems: Infinity });
    });

    it('should return infinite items for inputs with 1 and Infinity', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([{ totalItems: 1 }, { totalItems: Infinity }]))
        .toEqual({ totalItems: Infinity });
    });

    it('should return infinite items for inputs with Infinity and Infinity', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([{ totalItems: Infinity }, { totalItems: Infinity }]))
        .toEqual({ totalItems: Infinity });
    });

    it('should return infinite items for inputs with empty and 2', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([{}, { totalItems: 2 }]))
        .toEqual({ totalItems: Infinity });
    });

    it('should return infinite items for inputs with 1 and empty', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([{ totalItems: 1 }, {}]))
        .toEqual({ totalItems: Infinity });
    });

    it('should return infinite items for inputs with empty and empty', () => {
      return expect(ActorQueryOperationUnion.unionMetadata([{}, {}]))
        .toEqual({ totalItems: Infinity });
    });
  });

  describe('An ActorQueryOperationUnion instance', () => {
    let actor: ActorQueryOperationUnion;

    beforeEach(() => {
      actor = new ActorQueryOperationUnion({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on union', () => {
      const op = { operation: { type: 'union', left, right } };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-union', () => {
      const op = { operation: { type: 'some-other-type', left, right } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', () => {
      const op = { operation: { type: 'union', left, right } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ totalItems: 5 });
        expect(output.variables).toEqual([ 'a', 'b' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: literal('1') }),
          Bindings({ b: literal('1') }),
          Bindings({ a: literal('2') }),
          Bindings({ b: literal('2') }),
          Bindings({ a: literal('3') }),
        ]);
      });
    });

    it('should run with a left stream without metadata', () => {
      const op = { operation: { type: 'union', left: leftNoMeta, right } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(output.metadata).toBeFalsy();
        expect(output.variables).toEqual([ 'a', 'b' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: literal('1') }),
          Bindings({ b: literal('1') }),
          Bindings({ a: literal('2') }),
          Bindings({ b: literal('2') }),
          Bindings({ a: literal('3') }),
        ]);
      });
    });
  });
});
