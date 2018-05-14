import {ActorQueryOperation, Bindings} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {ArrayIterator} from "asynciterator";
import {literal, variable} from "rdf-data-model";
import {ActorQueryOperationExtend} from "../lib/ActorQueryOperationExtend";
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationExtend', () => {
  let bus;
  let mediatorQueryOperation;

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
  });

  describe('The ActorQueryOperationExtend module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationExtend).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationExtend constructor', () => {
      expect(new (<any> ActorQueryOperationExtend)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationExtend);
      expect(new (<any> ActorQueryOperationExtend)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationExtend objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationExtend)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationExtend instance', () => {
    let actor: ActorQueryOperationExtend;

    beforeEach(() => {
      actor = new ActorQueryOperationExtend({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on extend', () => {
      const op = { operation: { type: 'extend' } };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-extend', () => {
      const op = { operation: { type: 'some-other-type' } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', () => {
      const op = { operation: { type: 'extend' } };
      return expect(actor.run(op)).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
