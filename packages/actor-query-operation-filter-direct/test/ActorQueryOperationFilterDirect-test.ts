import {ActorQueryOperation, Bindings} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {ArrayIterator} from "asynciterator";
import {literal, variable} from "rdf-data-model";
import {ActorQueryOperationFilterDirect} from "../lib/ActorQueryOperationFilterDirect";
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationFilterDirect', () => {
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
        metadata: Promise.resolve({ totalItems: 3 }),
        operated: arg,
        variables: ['a'],
      }),
    };
  });

  describe('The ActorQueryOperationFilterDirect module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationFilterDirect).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationFilterDirect constructor', () => {
      expect(new (<any> ActorQueryOperationFilterDirect)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationFilterDirect);
      expect(new (<any> ActorQueryOperationFilterDirect)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationFilterDirect objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationFilterDirect)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationFilterDirect instance', () => {
    let actor: ActorQueryOperationFilterDirect;

    beforeEach(() => {
      actor = new ActorQueryOperationFilterDirect({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on filter', () => {
      const op = { operation: { type: 'filter' } };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-filter', () => {
      const op = { operation: { type: 'some-other-type' } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', () => {
      const op = { operation: { type: 'filter' } };
      return expect(actor.run(op)).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
