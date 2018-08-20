import {ActorQueryOperation, Bindings} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {namedNode, variable} from "@rdfjs/data-model";
import {ArrayIterator} from "asynciterator";
import {Algebra, Factory} from "sparqlalgebrajs";
import {ActorQueryOperationPathInv} from "../lib/ActorQueryOperationPathInv";
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationPathInv', () => {
  let bus;
  let mediatorQueryOperation;
  const factory: Factory = new Factory();

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ '?x': namedNode('1') }),
          Bindings({ '?x': namedNode('2') }),
          Bindings({ '?x': namedNode('3') }),
        ]),
        metadata: () => Promise.resolve({ totalItems: 3 }),
        operated: arg,
        type: 'bindings',
        variables: ['a'],
      }),
    };
  });

  describe('The ActorQueryOperationPathInv module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationPathInv).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationPathInv constructor', () => {
      expect(new (<any> ActorQueryOperationPathInv)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationPathInv);
      expect(new (<any> ActorQueryOperationPathInv)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationPathInv objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationPathInv)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationPathInv instance', () => {
    let actor: ActorQueryOperationPathInv;

    beforeEach(() => {
      actor = new ActorQueryOperationPathInv({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on Inv paths', () => {
      const op = { operation: { type: Algebra.types.PATH, predicate: { type: Algebra.types.INV }} };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should test on different paths', () => {
      const op = { operation: { type: Algebra.types.PATH, predicate: { type: 'dummy' }} };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should support Inv paths', async () => {
      const op = { operation: factory.createPath(
          namedNode('s'),
          factory.createInv(factory.createLink(namedNode('p'))),
          variable('x'),
        )};
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ '?x': namedNode('1') }),
        Bindings({ '?x': namedNode('2') }),
        Bindings({ '?x': namedNode('3') }),
      ]);
      expect((<any> output).operated.operation).toEqual(
        factory.createPath(variable('x'), factory.createLink(namedNode('p')), namedNode('s')));
    });
  });
});
