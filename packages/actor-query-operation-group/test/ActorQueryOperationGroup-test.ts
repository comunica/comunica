import {ActorQueryOperation, Bindings} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {ArrayIterator} from "asynciterator";
import {literal, variable} from "@rdfjs/data-model";
import {ActorQueryOperationGroup} from "../lib/ActorQueryOperationGroup";
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationGroup', () => {
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

  describe('The ActorQueryOperationGroup module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationGroup).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationGroup constructor', () => {
      expect(new (<any> ActorQueryOperationGroup)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationGroup);
      expect(new (<any> ActorQueryOperationGroup)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationGroup objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationGroup)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationGroup instance', () => {
    let actor: ActorQueryOperationGroup;

    beforeEach(() => {
      actor = new ActorQueryOperationGroup({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on group', () => {
      const op = { operation: { type: 'group' } };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-group', () => {
      const op = { operation: { type: 'some-other-type' } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', () => {
      const op = { operation: { type: 'group' } };
      return expect(actor.run(op)).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
