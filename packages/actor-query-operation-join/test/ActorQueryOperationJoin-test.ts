import { BindingsFactory } from '@comunica/bindings-factory';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { ActionContext, Bus } from '@comunica/core';
import type { IJoinEntry, IQueryOperationResultBindings } from '@comunica/types';
import { ArrayIterator, UnionIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationJoin } from '../lib/ActorQueryOperationJoin';
import '@comunica/jest';

const DF = new DataFactory();
const BF = new BindingsFactory();

describe('ActorQueryOperationJoin', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let mediatorJoin: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false, variables: [ DF.variable('a') ]}),
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
          variables: [ DF.variable('a'), DF.variable('b') ],
        }),
        operated: arg,
        type: 'bindings',
      }),
    };
  });

  describe('The ActorQueryOperationJoin module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationJoin).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationJoin constructor', () => {
      expect(new (<any> ActorQueryOperationJoin)({ name: 'actor', bus, mediatorQueryOperation, mediatorJoin }))
        .toBeInstanceOf(ActorQueryOperationJoin);
      expect(new (<any> ActorQueryOperationJoin)({ name: 'actor', bus, mediatorQueryOperation, mediatorJoin }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationJoin objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationJoin)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationJoin instance', () => {
    let actor: ActorQueryOperationJoin;

    beforeEach(() => {
      actor = new ActorQueryOperationJoin({ name: 'actor', bus, mediatorQueryOperation, mediatorJoin });
    });

    it('should test on join', () => {
      const op: any = { operation: { type: 'join' }};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-join', () => {
      const op: any = { operation: { type: 'some-other-type' }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', () => {
      const op: any = { operation: { type: 'join', input: [{}, {}, {}]}, context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        expect(output.type).toEqual('bindings');
        expect(await output.metadata()).toEqual({
          cardinality: 100,
          canContainUndefs: false,
          variables: [ DF.variable('a'), DF.variable('b') ],
        });
        await expect(output.bindingsStream).toEqualBindingsStream([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ]);
      });
    });
  });
});
