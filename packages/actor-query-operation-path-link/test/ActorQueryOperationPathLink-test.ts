import { ActorQueryOperation, Bindings } from '@comunica/bus-query-operation';
import { Bus } from '@comunica/core';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Algebra, Factory } from 'sparqlalgebrajs';
import { ActorQueryOperationPathLink } from '../lib/ActorQueryOperationPathLink';
const arrayifyStream = require('arrayify-stream');
const DF = new DataFactory();

describe('ActorQueryOperationPathLink', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  const factory: Factory = new Factory();

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ '?x': DF.literal('1') }),
          Bindings({ '?x': DF.literal('2') }),
          Bindings({ '?x': DF.literal('3') }),
        ]),
        metadata: () => Promise.resolve({ totalItems: 3 }),
        operated: arg,
        type: 'bindings',
        variables: [ 'a' ],
        canContainUndefs: false,
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
      const op = { operation: { type: Algebra.types.PATH, predicate: { type: Algebra.types.LINK }}};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should test on different paths', () => {
      const op = { operation: { type: Algebra.types.PATH, predicate: { type: 'dummy' }}};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should support Link paths', async() => {
      const op = { operation: factory
        .createPath(DF.namedNode('s'), factory.createLink(DF.namedNode('p')), DF.variable('x')) };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(output.canContainUndefs).toEqual(false);
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ '?x': DF.literal('1') }),
        Bindings({ '?x': DF.literal('2') }),
        Bindings({ '?x': DF.literal('3') }),
      ]);
    });
  });
});
