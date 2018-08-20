import {ActorQueryOperation, Bindings} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {literal, namedNode, variable} from "@rdfjs/data-model";
import {ArrayIterator} from "asynciterator";
import {Algebra, Factory} from "sparqlalgebrajs";
import {ActorQueryOperationPathLink} from "../lib/ActorQueryOperationPathLink";
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationPathLink', () => {
  let bus;
  let mediatorQueryOperation;
  const factory: Factory = new Factory();

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ '?x': literal('1') }),
          Bindings({ '?x': literal('2') }),
          Bindings({ '?x': literal('3') }),
        ]),
        metadata: () => Promise.resolve({ totalItems: 3 }),
        operated: arg,
        type: 'bindings',
        variables: ['a'],
      }),
    };
  });

  describe('The ActorQueryOperationPathLink module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationPathLink).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationPathLink constructor', () => {
      expect(new (<any> ActorQueryOperationPathLink)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationPathLink);
      expect(new (<any> ActorQueryOperationPathLink)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationPathLink objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationPathLink)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationPathLink instance', () => {
    let actor: ActorQueryOperationPathLink;

    beforeEach(() => {
      actor = new ActorQueryOperationPathLink({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on Link paths', () => {
      const op = { operation: { type: Algebra.types.PATH, predicate: { type: Algebra.types.LINK }} };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should test on different paths', () => {
      const op = { operation: { type: Algebra.types.PATH, predicate: { type: 'dummy' }} };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should support Link paths', async () => {
      const op = { operation: factory.createPath(namedNode('s'), factory.createLink(namedNode('p')), variable('x')) };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ '?x': literal('1') }),
        Bindings({ '?x': literal('2') }),
        Bindings({ '?x': literal('3') }),
      ]);
    });
  });
});
