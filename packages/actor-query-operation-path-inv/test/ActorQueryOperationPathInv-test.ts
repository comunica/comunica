import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { getSafeBindings } from '@comunica/utils-query-operation';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Algebra, Factory } from 'sparqlalgebrajs';
import { ActorQueryOperationPathInv } from '../lib/ActorQueryOperationPathInv';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

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
        metadata: () => Promise.resolve({ cardinality: 3 }),
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
      expect(() => {
        (<any> ActorQueryOperationPathInv)();
      }).toThrow(`Class constructor ActorQueryOperationPathInv cannot be invoked without 'new'`);
    });
  });

  describe('An ActorQueryOperationPathInv instance', () => {
    let actor: ActorQueryOperationPathInv;

    beforeEach(() => {
      actor = new ActorQueryOperationPathInv({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on Inv paths', async() => {
      const op: any = {
        operation: { type: Algebra.types.PATH, predicate: { type: Algebra.types.INV }, context: new ActionContext() },
      };
      await expect(actor.test(op)).resolves.toPassTestVoid();
    });

    it('should test on different paths', async() => {
      const op: any = {
        operation: { type: Algebra.types.PATH, predicate: { type: 'dummy' }, context: new ActionContext() },
      };
      await expect(actor.test(op)).resolves.toFailTest(`This Actor only supports inv Path operations.`);
    });

    it('should support Inv paths', async() => {
      const op: any = { operation: factory.createPath(
        DF.namedNode('s'),
        factory.createInv(factory.createLink(DF.namedNode('p'))),
        DF.variable('x'),
      ), context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }) };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toEqual({ cardinality: 3 });
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
