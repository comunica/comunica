import { BindingsFactory } from '@comunica/bindings-factory';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { ActionContext, Bus } from '@comunica/core';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Algebra, Factory } from 'sparqlalgebrajs';
import { ActorQueryOperationPathInv } from '../lib/ActorQueryOperationPathInv';
import '@comunica/jest';

const DF = new DataFactory();
const BF = new BindingsFactory();

describe('ActorQueryOperationPathInv', () => {
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
      const op: any = { operation: { type: Algebra.types.PATH,
        predicate: { type: Algebra.types.INV },
        context: new ActionContext() }};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should test on different paths', () => {
      const op: any = { operation: { type: Algebra.types.PATH,
        predicate: { type: 'dummy' },
        context: new ActionContext() }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should support Inv paths', async() => {
      const op: any = { operation: factory.createPath(
        DF.namedNode('s'),
        factory.createInv(factory.createLink(DF.namedNode('p'))),
        DF.variable('x'),
      ),
      context: new ActionContext() };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(await output.metadata()).toEqual({ cardinality: 3, canContainUndefs: false });
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('x'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('3') ]]),
      ]);
      expect((<any> output).operated.operation).toEqual(
        factory.createPath(DF.variable('x'), factory.createLink(DF.namedNode('p')), DF.namedNode('s')),
      );
    });
  });
});
