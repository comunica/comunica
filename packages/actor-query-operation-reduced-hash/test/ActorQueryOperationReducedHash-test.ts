import { BindingsFactory } from '@comunica/bindings-factory';
import { ActionContext, Bus } from '@comunica/core';
import type { IQueryOperationResultBindings } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationReducedHash } from '..';
import '@comunica/jest';

const DF = new DataFactory();
const BF = new BindingsFactory();

describe('ActorQueryOperationReducedHash', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let mediatorHashBindings: any;
  let cacheSize: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
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
    cacheSize = 20;
  });

  describe('#newReducedHashFilter', () => {
    let actor: ActorQueryOperationReducedHash;

    beforeEach(() => {
      actor = new ActorQueryOperationReducedHash(
        { name: 'actor', bus, mediatorQueryOperation, cacheSize, mediatorHashBindings },
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

  describe('An ActorQueryOperationReducedHash instance', () => {
    let actor: ActorQueryOperationReducedHash;

    beforeEach(() => {
      actor = new ActorQueryOperationReducedHash(
        { name: 'actor', bus, mediatorQueryOperation, mediatorHashBindings, cacheSize },
      );
    });

    it('should test on reduced', () => {
      const op: any = { operation: { type: 'reduced' }};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-reduced', () => {
      const op: any = { operation: { type: 'some-other-type' }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', () => {
      const op: any = { operation: { type: 'reduced' }, context: new ActionContext() };
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

// eslint-disable-next-line mocha/max-top-level-suites
describe('Smaller cache than number of queries', () => {
  let actor: ActorQueryOperationReducedHash;
  let bus: any;
  let mediatorQueryOperation: any;
  let mediatorHashBindings: any;
  let cacheSize: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    cacheSize = 1;
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        ]),
        metadata: () => Promise.resolve({ cardinality: 7, variables: [ DF.variable('a') ]}),
        operated: arg,
        type: 'bindings',
      }),
    };
    mediatorHashBindings = {
      mediate: () => Promise.resolve({ hashFunction: (bindings: any) => JSON.stringify(bindings) }),
    };
    actor = new ActorQueryOperationReducedHash(
      { name: 'actor', bus, mediatorQueryOperation, mediatorHashBindings, cacheSize },
    );
  });
  it('should run', () => {
    const op: any = { operation: { type: 'reduced' }, context: new ActionContext() };
    return actor.run(op).then(async(output: IQueryOperationResultBindings) => {
      expect(await output.metadata()).toEqual({ cardinality: 7, variables: [ DF.variable('a') ]});
      expect(output.type).toEqual('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
      ]);
    });
  });
});
