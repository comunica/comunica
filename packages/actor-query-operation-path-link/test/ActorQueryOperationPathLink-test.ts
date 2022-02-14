import { BindingsFactory } from '@comunica/bindings-factory';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { ActionContext, Bus } from '@comunica/core';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Algebra, Factory } from 'sparqlalgebrajs';
import { ActorQueryOperationPathLink } from '../lib/ActorQueryOperationPathLink';
import '@comunica/jest';

const DF = new DataFactory();
const BF = new BindingsFactory();

describe('ActorQueryOperationPathLink', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  const factory: Factory = new Factory();

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([[ DF.variable('x'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('x'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('x'), DF.literal('3') ]]),
        ]),
        metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false }),
        operated: arg,
        type: 'bindings',
        variables: [ DF.variable('a') ],
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
      const op: any = { operation: { type: Algebra.types.PATH, predicate: { type: Algebra.types.LINK }}};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should test on different paths', () => {
      const op: any = { operation: { type: Algebra.types.PATH, predicate: { type: 'dummy' }},
        context: new ActionContext() };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should support Link paths', async() => {
      const op: any = { operation: factory
        .createPath(DF.namedNode('s'), factory.createLink(DF.namedNode('p')), DF.variable('x')),
      context: new ActionContext() };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(await output.metadata()).toEqual({ cardinality: 3, canContainUndefs: false });
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('x'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('3') ]]),
      ]);
    });
  });
});
