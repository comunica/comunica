import {ActorQueryOperation, Bindings} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {ArrayIterator} from "asynciterator";
import {literal, variable} from "rdf-data-model";
import {ActorQueryOperationLeftJoin} from "../lib/ActorQueryOperationLeftJoin";
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationLeftJoin', () => {
  let bus;
  let mediatorQueryOperation;
  let left;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    left = false;
    const bindingStreamLeft = new ArrayIterator([
      Bindings({ a: literal('1') }),
      Bindings({ a: literal('2') }),
      Bindings({ a: literal('3') }),
    ]);
    const bindingStreamRight = new ArrayIterator([
      Bindings({ a: literal('1'), b: literal('1') }),
      Bindings({ a: literal('3'), b: literal('1') }),
      Bindings({ a: literal('3'), b: literal('2') }),
    ]);
    mediatorQueryOperation = {
      mediate: (arg) => {
        left = !left;
        return Promise.resolve({
          bindingsStream: left ? bindingStreamLeft : bindingStreamRight,
          metadata: Promise.resolve({totalItems: 3}),
          operated: arg,
          variables: left ? ['a'] : ['a', 'b'],
        });
      },
    };
  });

  describe('The ActorQueryOperationLeftJoin module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationLeftJoin).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationLeftJoin constructor', () => {
      expect(new (<any> ActorQueryOperationLeftJoin)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationLeftJoin);
      expect(new (<any> ActorQueryOperationLeftJoin)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationLeftJoin objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationLeftJoin)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationLeftJoin instance', () => {
    let actor: ActorQueryOperationLeftJoin;

    beforeEach(() => {
      actor = new ActorQueryOperationLeftJoin({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on leftjoin', () => {
      const op = { operation: { type: 'leftjoin' } };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-leftjoin', () => {
      const op = { operation: { type: 'some-other-type' } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', () => {
      const op = { operation: { type: 'leftjoin', left: {}, right: {} } };
      return actor.run(op).then(async (output) => {
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: literal('1'), b: literal('1') }),
          Bindings({ a: literal('2') }),
          Bindings({ a: literal('3'), b: literal('1') }),
          Bindings({ a: literal('3'), b: literal('2') }),
        ]);
      });
    });
  });
});
