import {ActorQueryOperation, Bindings, IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {literal} from "@rdfjs/data-model";
import {ArrayIterator} from "asynciterator";
import {ActorQueryOperationMinus} from "..";
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationMinus', () => {
  let bus;
  let mediatorQueryOperation;
  let left;
  let right;
  let rightNoCommons;
  let hashAlgorithm;
  let digestAlgorithm;

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
    rightNoCommons = {
      metadata: () => Promise.resolve({ totalItems: 2 }),
      stream: new ArrayIterator([
        Bindings({ b: literal('1') }),
        Bindings({ b: literal('2') }),
      ]),
      type: 'bindings',
      variables: [ 'b' ],
    };
    right = {
      metadata: () => Promise.resolve({ totalItems: 2 }),
      stream: new ArrayIterator([
        Bindings({ a: literal('1') }),
        Bindings({ a: literal('2') }),
      ]),
      type: 'bindings',
      variables: [ 'a' ],
    };
    hashAlgorithm = 'sha1';
    digestAlgorithm = 'base64';
  });

  describe('The ActorQueryOperationMinus module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationMinus).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationMinus constructor', () => {
      expect(new (<any> ActorQueryOperationMinus)
        ({ name: 'actor', bus, mediatorQueryOperation, hashAlgorithm, digestAlgorithm }))
                .toBeInstanceOf(ActorQueryOperationMinus);
      expect(new (<any> ActorQueryOperationMinus)
        ({ name: 'actor', bus, mediatorQueryOperation, hashAlgorithm, digestAlgorithm }))
                .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationMinus objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationMinus)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationMinus instance', () => {
    let actor: ActorQueryOperationMinus;

    beforeEach(() => {
      actor = new ActorQueryOperationMinus(
          { name: 'actor', bus, mediatorQueryOperation, hashAlgorithm, digestAlgorithm });
    });

    it('should test on minus', () => {
      const op = { operation: { type: 'minus', left, right } };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-minus', () => {
      const op = { operation: { type: 'some-other-type', left, right } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', () => {
      const op = { operation: { type: 'minus', left, right } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ totalItems: 3 });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: literal('3') }),
        ]);
      });
    });

    it('should run with a left stream without metadata', () => {
      const op = { operation: { type: 'union', left, right: rightNoCommons } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ totalItems: 3 });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: literal('1') }),
          Bindings({ a: literal('2') }),
          Bindings({ a: literal('3') }),
        ]);
      });
    });

  });
});
