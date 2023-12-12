import { BindingsFactory } from '@comunica/bindings-factory';
import { ActionContext, Bus } from '@comunica/core';
import type { IQueryOperationResultBindings } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationDistinctHash } from '..';
import '@comunica/jest';

const DF = new DataFactory();
const BF = new BindingsFactory();

describe('ActorQueryOperationDistinctHash', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let mediatorHashBindings: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        ]),
        metadata: () => Promise.resolve({ cardinality: 5, variables: [ DF.variable('a') ]}),
        operated: arg,
        type: 'bindings',
      }),
    };
    mediatorHashBindings = {
      mediate: () => Promise.resolve({ hashFunction: (bindings: any) => JSON.stringify(bindings) }),
    };
  });

  describe('#newDistinctHashFilter', () => {
    let actor: ActorQueryOperationDistinctHash;

    beforeEach(() => {
      actor = new ActorQueryOperationDistinctHash(
        { name: 'actor', bus, mediatorQueryOperation, mediatorHashBindings },
      );
    });
    it('should create a filter', async() => {
      expect(await actor.newHashFilter(new ActionContext())).toBeInstanceOf(Function);
    });

    it('should create a filter that is a predicate', async() => {
      const filter = await actor.newHashFilter(new ActionContext());
      expect(filter(BF.bindings([[ DF.variable('a'), DF.literal('a') ]]))).toBe(true);
    });

    it('should create a filter that only returns true once for equal objects', async() => {
      const filter = await actor.newHashFilter(new ActionContext());
      expect(filter(BF.bindings([[ DF.variable('a'), DF.literal('a') ]]))).toBe(true);
      expect(filter(BF.bindings([[ DF.variable('a'), DF.literal('a') ]]))).toBe(false);
      expect(filter(BF.bindings([[ DF.variable('a'), DF.literal('a') ]]))).toBe(false);
      expect(filter(BF.bindings([[ DF.variable('a'), DF.literal('a') ]]))).toBe(false);

      expect(filter(BF.bindings([[ DF.variable('a'), DF.literal('b') ]]))).toBe(true);
      expect(filter(BF.bindings([[ DF.variable('a'), DF.literal('b') ]]))).toBe(false);
      expect(filter(BF.bindings([[ DF.variable('a'), DF.literal('b') ]]))).toBe(false);
      expect(filter(BF.bindings([[ DF.variable('a'), DF.literal('b') ]]))).toBe(false);
    });

    it('should create a filters that are independent', async() => {
      const filter1 = await actor.newHashFilter(new ActionContext());
      const filter2 = await actor.newHashFilter(new ActionContext());
      const filter3 = await actor.newHashFilter(new ActionContext());
      expect(filter1(BF.bindings([[ DF.variable('a'), DF.literal('b') ]]))).toBe(true);
      expect(filter1(BF.bindings([[ DF.variable('a'), DF.literal('b') ]]))).toBe(false);

      expect(filter2(BF.bindings([[ DF.variable('a'), DF.literal('b') ]]))).toBe(true);
      expect(filter2(BF.bindings([[ DF.variable('a'), DF.literal('b') ]]))).toBe(false);

      expect(filter3(BF.bindings([[ DF.variable('a'), DF.literal('b') ]]))).toBe(true);
      expect(filter3(BF.bindings([[ DF.variable('a'), DF.literal('b') ]]))).toBe(false);
    });
  });

  describe('An ActorQueryOperationDistinctHash instance', () => {
    let actor: ActorQueryOperationDistinctHash;
    beforeEach(() => {
      actor = new ActorQueryOperationDistinctHash(
        { name: 'actor', bus, mediatorQueryOperation, mediatorHashBindings },
      );
    });

    it('should test on distinct', () => {
      const op: any = { operation: { type: 'distinct' }, context: new ActionContext() };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-distinct', () => {
      const op: any = { operation: { type: 'some-other-type' }, context: new ActionContext() };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', () => {
      const op: any = { operation: { type: 'distinct' }, context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata()).toEqual({ cardinality: 5, variables: [ DF.variable('a') ]});
        expect(output.type).toEqual('bindings');
        await expect(output.bindingsStream).toEqualBindingsStream([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ]);
      });
    });
  });
});
