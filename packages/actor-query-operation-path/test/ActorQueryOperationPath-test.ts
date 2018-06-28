import {ActorQueryOperation, Bindings} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {ArrayIterator} from "asynciterator";
import {literal, variable} from "rdf-data-model";
import {ActorQueryOperationPath} from "../lib/ActorQueryOperationPath";
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationPath', () => {
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

  describe('The ActorQueryOperationPath module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationPath).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationPath constructor', () => {
      expect(new (<any> ActorQueryOperationPath)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationPath);
      expect(new (<any> ActorQueryOperationPath)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationPath objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationPath)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationPath instance', () => {
    let actor: ActorQueryOperationPath;

    beforeEach(() => {
      actor = new ActorQueryOperationPath({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on path', () => {
      const op = { operation: { type: 'path' } };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-path', () => {
      const op = { operation: { type: 'some-other-type' } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', () => {
      const op = { operation: { type: 'path' } };
      return expect(actor.run(op)).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
