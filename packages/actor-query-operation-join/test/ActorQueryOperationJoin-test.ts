import {ActorQueryOperation, Bindings, IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {literal} from "@rdfjs/data-model";
import {ArrayIterator} from "asynciterator";
import {ActorQueryOperationJoin} from "../lib/ActorQueryOperationJoin";
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationJoin', () => {
  let bus;
  let mediatorQueryOperation;
  let mediatorJoin;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ a: literal('1') }),
          Bindings({ a: literal('2') }),
          Bindings({ a: literal('3') }),
        ]),
        metadata: () => Promise.resolve({ totalItems: 3 }),
        operated: arg,
        type: 'bindings',
        variables: ['a'],
      }),
    };
    mediatorJoin = {
      mediate: (arg) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ a: literal('1'), b: literal('1') }),
          Bindings({ a: literal('2'), b: literal('2') }),
        ]),
        metadata: () => Promise.resolve({ totalItems: 2 }),
        operated: arg,
        type: 'bindings',
        variables: ['a', 'b'],
      }),
    };
  });

  describe('The ActorQueryOperationJoin module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationJoin).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationJoin constructor', () => {
      expect(new (<any> ActorQueryOperationJoin)({ name: 'actor', bus, mediatorQueryOperation, mediatorJoin }))
        .toBeInstanceOf(ActorQueryOperationJoin);
      expect(new (<any> ActorQueryOperationJoin)({ name: 'actor', bus, mediatorQueryOperation, mediatorJoin }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationJoin objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationJoin)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationJoin instance', () => {
    let actor: ActorQueryOperationJoin;

    beforeEach(() => {
      actor = new ActorQueryOperationJoin({ name: 'actor', bus, mediatorQueryOperation, mediatorJoin });
    });

    it('should test on join', () => {
      const op = { operation: { type: 'join' } };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-join', () => {
      const op = { operation: { type: 'some-other-type' } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', () => {
      const op = { operation: { type: 'join' } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual(['a', 'b']);
        expect(output.type).toEqual('bindings');
        expect(await output.metadata()).toEqual({ totalItems: 2 });
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: literal('1'), b: literal('1') }),
          Bindings({ a: literal('2'), b: literal('2') }),
        ]);
      });
    });
  });
});
