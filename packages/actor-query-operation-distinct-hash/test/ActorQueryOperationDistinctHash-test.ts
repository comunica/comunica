import { BindingsFactory } from '@comunica/bindings-factory';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { ActionContext, Bus } from '@comunica/core';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationDistinctHash } from '..';
import '@comunica/jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

describe('ActorQueryOperationDistinctHash', () => {
  let bus: any;
  let mediatorQueryOperationBindings: any;
  let mediatorQueryOperationQuads: any;
  let mediatorHashBindings: any;
  let mediatorHashQuads: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperationBindings = {
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
    mediatorQueryOperationQuads = {
      mediate: (arg: any) => Promise.resolve({
        quadStream: new ArrayIterator([
          DF.quad(
            DF.namedNode('s'),
            DF.namedNode('p'),
            DF.namedNode('o'),
          ),
          DF.quad(
            DF.namedNode('s2'),
            DF.namedNode('p'),
            DF.namedNode('o'),
          ),
          DF.quad(
            DF.namedNode('s'),
            DF.namedNode('p'),
            DF.namedNode('o'),
          ),
        ]),
        metadata: () => Promise.resolve({ cardinality: 3 }),
        operated: arg,
        type: 'quads',
      }),
    };
    mediatorHashBindings = {
      mediate: () => Promise.resolve({ hashFunction: (bindings: any) => JSON.stringify(bindings) }),
    };
    mediatorHashQuads = {
      mediate: () => Promise.resolve({ hashFunction: (bindings: any) => JSON.stringify(bindings) }),
    };
  });

  describe('#newDistinctHashFilter', () => {
    let actor: ActorQueryOperationDistinctHash;

    beforeEach(() => {
      actor = new ActorQueryOperationDistinctHash(
        { name: 'actor', bus, mediatorQueryOperation: mediatorHashBindings, mediatorHashBindings, mediatorHashQuads },
      );
    });
    it('should create a filter', async() => {
      await expect(actor.newHashFilter(new ActionContext())).resolves.toBeInstanceOf(Function);
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

  describe('#newHashFilterQuads', () => {
    let actor: ActorQueryOperationDistinctHash;

    beforeEach(() => {
      actor = new ActorQueryOperationDistinctHash(
        { name: 'actor', bus, mediatorQueryOperation: mediatorHashBindings, mediatorHashBindings, mediatorHashQuads },
      );
    });
    it('should create a filter', async() => {
      await expect(actor.newHashFilterQuads(new ActionContext())).resolves.toBeInstanceOf(Function);
    });

    it('should create a filter that is a predicate', async() => {
      const filter = await actor.newHashFilterQuads(new ActionContext());
      expect(filter(DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o')))).toBe(true);
    });

    it('should create a filter that only returns true once for equal objects', async() => {
      const filter = await actor.newHashFilterQuads(new ActionContext());
      expect(filter(DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o')))).toBe(true);
      expect(filter(DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o')))).toBe(false);
      expect(filter(DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o')))).toBe(false);
      expect(filter(DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o')))).toBe(false);

      expect(filter(DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')))).toBe(true);
      expect(filter(DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')))).toBe(false);
      expect(filter(DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')))).toBe(false);
      expect(filter(DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')))).toBe(false);
    });

    it('should create a filters that are independent', async() => {
      const filter1 = await actor.newHashFilterQuads(new ActionContext());
      const filter2 = await actor.newHashFilterQuads(new ActionContext());
      const filter3 = await actor.newHashFilterQuads(new ActionContext());
      expect(filter1(DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')))).toBe(true);
      expect(filter1(DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')))).toBe(false);

      expect(filter2(DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')))).toBe(true);
      expect(filter2(DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')))).toBe(false);

      expect(filter3(DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')))).toBe(true);
      expect(filter3(DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')))).toBe(false);
    });

    // TODO remove this test once mediatorHashQuads has become a required argument
    it('should not filter when mediatorHashQuads is not defined', async() => {
      actor = new ActorQueryOperationDistinctHash(
        { name: 'actor', bus, mediatorQueryOperation: mediatorHashBindings, mediatorHashBindings },
      );

      const filter = await actor.newHashFilterQuads(new ActionContext());
      expect(filter(DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')))).toBe(true);
      expect(filter(DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')))).toBe(true);
    });
  });

  describe('An ActorQueryOperationDistinctHash instance', () => {
    let actor: ActorQueryOperationDistinctHash;
    beforeEach(() => {
      actor = new ActorQueryOperationDistinctHash(
        // eslint-disable-next-line max-len
        { name: 'actor', bus, mediatorQueryOperation: mediatorQueryOperationBindings, mediatorHashBindings, mediatorHashQuads },
      );
    });

    it('should test on distinct', async() => {
      const op: any = { operation: { type: 'distinct' }, context: new ActionContext() };
      await expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-distinct', async() => {
      const op: any = { operation: { type: 'some-other-type' }, context: new ActionContext() };
      await expect(actor.test(op)).rejects.toBeTruthy();
    });

    describe('with bindings input', () => {
      beforeEach(() => {
        actor = new ActorQueryOperationDistinctHash(
          // eslint-disable-next-line max-len
          { name: 'actor', bus, mediatorQueryOperation: mediatorQueryOperationBindings, mediatorHashBindings, mediatorHashQuads },
        );
      });

      it('should handle bindings', async() => {
        const op: any = { operation: { type: 'distinct' }, context: new ActionContext() };
        const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
        await expect(output.metadata()).resolves.toEqual({ cardinality: 5, variables: [ DF.variable('a') ]});
        expect(output.type).toBe('bindings');
        await expect(output.bindingsStream).toEqualBindingsStream([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ]);
      });
    });

    describe('with quad input', () => {
      beforeEach(() => {
        actor = new ActorQueryOperationDistinctHash(
          // eslint-disable-next-line max-len
          { name: 'actor', bus, mediatorQueryOperation: mediatorQueryOperationQuads, mediatorHashBindings, mediatorHashQuads },
        );
      });

      it('should filter duplicate quads', async() => {
        const op: any = { operation: { type: 'distinct' }, context: new ActionContext() };
        const output = ActorQueryOperation.getSafeQuads(await actor.run(op));
        await expect(output.metadata()).resolves.toEqual({ cardinality: 3 });
        expect(output.type).toBe('quads');
        await expect(output.quadStream.toArray()).resolves.toEqual([
          DF.quad(
            DF.namedNode('s'),
            DF.namedNode('p'),
            DF.namedNode('o'),
          ),
          DF.quad(
            DF.namedNode('s2'),
            DF.namedNode('p'),
            DF.namedNode('o'),
          ),
        ]);
      });
    });
  });
});
