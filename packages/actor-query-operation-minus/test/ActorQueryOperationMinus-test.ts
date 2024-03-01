import { BindingsFactory } from '@comunica/bindings-factory';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { ActionContext, Bus } from '@comunica/core';
import type { IJoinEntry } from '@comunica/types';
import { ArrayIterator, UnionIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationMinus } from '../lib/ActorQueryOperationMinus';
import '@comunica/jest';

const DF = new DataFactory();
const BF = new BindingsFactory();

describe('ActorQueryOperationMinus', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let mediatorJoin: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([[ DF.variable('x'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('x'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('x'), DF.literal('3') ]]),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false, variables: [ DF.variable('x') ]}),
        operated: arg,
        type: 'bindings',
      }),
    };
    mediatorJoin = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new UnionIterator(arg.entries.map((entry: IJoinEntry) => entry.output.bindingsStream)),
        metadata: () => Promise.resolve({
          cardinality: 100,
          canContainUndefs: false,
          variables: [ DF.variable('x'), DF.variable('y') ],
        }),
        operated: arg,
        type: 'bindings',
      }),
    };
  });

  describe('The ActorQueryOperationMinus module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationMinus).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationMinus constructor', () => {
      expect(new (<any> ActorQueryOperationMinus)({ name: 'actor', bus, mediatorQueryOperation, mediatorJoin }))
        .toBeInstanceOf(ActorQueryOperationMinus);
      expect(new (<any> ActorQueryOperationMinus)({ name: 'actor', bus, mediatorQueryOperation, mediatorJoin }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationMinus objects without \'new\'', () => {
      expect(() => {
        (<any> ActorQueryOperationMinus)();
      }).toThrow(`Class constructor ActorQueryOperationMinus cannot be invoked without 'new'`);
    });
  });

  describe('An ActorQueryOperationMinus instance', () => {
    let actor: ActorQueryOperationMinus;

    beforeEach(() => {
      actor = new ActorQueryOperationMinus({ name: 'actor', bus, mediatorQueryOperation, mediatorJoin });
    });

    it('should test on minus', async() => {
      const op: any = { operation: { type: 'minus' }};
      await expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-minus', async() => {
      const op: any = { operation: { type: 'some-other-type' }};
      await expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', async() => {
      const op: any = { operation: { type: 'minus', input: [{}, {}, {}]}, context: new ActionContext() };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(output.type).toBe('bindings');
      await expect(output.metadata()).resolves.toEqual({
        cardinality: 100,
        canContainUndefs: false,
        variables: [ DF.variable('x'), DF.variable('y') ],
      });
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('x'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('3') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('3') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('3') ]]),
      ]);
    });
  });
});
