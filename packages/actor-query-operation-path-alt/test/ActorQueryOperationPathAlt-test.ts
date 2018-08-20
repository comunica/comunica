import {ActorQueryOperation, Bindings} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {literal, namedNode, variable} from "@rdfjs/data-model";
import {ArrayIterator} from "asynciterator";
import {Algebra, Factory} from "sparqlalgebrajs";
import {ActorQueryOperationPathAlt} from "../lib/ActorQueryOperationPathAlt";
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationPathAlt', () => {
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

  describe('The ActorQueryOperationPathAlt module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationPathAlt).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationPathAlt constructor', () => {
      expect(new (<any> ActorQueryOperationPathAlt)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationPathAlt);
      expect(new (<any> ActorQueryOperationPathAlt)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationPathAlt objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationPathAlt)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationPathAlt instance', () => {
    let actor: ActorQueryOperationPathAlt;

    beforeEach(() => {
      actor = new ActorQueryOperationPathAlt({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on Alt paths', () => {
      const op = { operation: { type: Algebra.types.PATH, predicate: { type: Algebra.types.ALT }} };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should test on different paths', () => {
      const op = { operation: { type: Algebra.types.PATH, predicate: { type: 'dummy' }} };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should not test on non-leftjoin', () => {
      const op = { operation: { type: 'some-other-type' } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should support Alt paths', async () => {
      const op = { operation: factory.createPath(
          namedNode('s'),
          factory.createAlt(factory.createLink(namedNode('p1')), factory.createLink(namedNode('p2'))),
          variable('x')),
      };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ '?x': literal('1') }),
        Bindings({ '?x': literal('1') }),
        Bindings({ '?x': literal('2') }),
        Bindings({ '?x': literal('2') }),
        Bindings({ '?x': literal('3') }),
        Bindings({ '?x': literal('3') }),
      ]);
    });
  });
});
