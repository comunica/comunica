import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { ActionContext, Bus } from '@comunica/core';
import type { IJoinEntry } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { getSafeBindings } from '@comunica/utils-query-operation';
import { ArrayIterator, UnionIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationJoin } from '../lib/ActorQueryOperationJoin';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

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
        metadata: () => Promise.resolve({
          cardinality: 3,
          variables: [{ variable: DF.variable('a'), canBeUndef: false }],
        }),
        operated: arg,
        type: 'bindings',
      }),
    };
    mediatorJoin = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new UnionIterator(arg.entries.map((entry: IJoinEntry) => entry.output.bindingsStream)),
        metadata: () => Promise.resolve({
          cardinality: 100,
          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
            { variable: DF.variable('b'), canBeUndef: false },
          ],
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
      expect(() => {
        (<any> ActorQueryOperationJoin)();
      }).toThrow(`Class constructor ActorQueryOperationJoin cannot be invoked without 'new'`);
    });
  });

  describe('An ActorQueryOperationJoin instance', () => {
    let actor: ActorQueryOperationJoin;

    beforeEach(() => {
      actor = new ActorQueryOperationJoin({ name: 'actor', bus, mediatorQueryOperation, mediatorJoin });
    });

    it('should test on join', async() => {
      const op: any = { operation: { type: 'join' }};
      await expect(actor.test(op)).resolves.toPassTestVoid();
    });

    it('should not test on non-join', async() => {
      const op: any = { operation: { type: 'some-other-type' }};
      await expect(actor.test(op)).resolves.toFailTest(`Actor actor only supports join operations, but got some-other-type`);
    });

    it('should run', async() => {
      const op: any = { operation: { type: 'join', input: [{}, {}, {}]}, context: new ActionContext() };
      const output = getSafeBindings(await actor.run(op, undefined));
      expect(output.type).toBe('bindings');
      await expect(output.metadata()).resolves.toEqual({
        cardinality: 100,
        variables: [
          { variable: DF.variable('a'), canBeUndef: false },
          { variable: DF.variable('b'), canBeUndef: false },
        ],
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
