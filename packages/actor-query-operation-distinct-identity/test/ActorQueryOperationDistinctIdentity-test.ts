import { ActionContext, Bus } from '@comunica/core';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { getSafeBindings, getSafeQuads } from '@comunica/utils-query-operation';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationDistinctIdentity } from '..';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

describe('ActorQueryOperationDistinctIdentity', () => {
  let bus: any;
  let mediatorQueryOperationBindings: any;
  let mediatorQueryOperationQuads: any;

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
        metadata: () => Promise.resolve({ cardinality: 5, variables: [{ variable: DF.variable('a') }]}),
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
  });

  describe('#newDistinctIdentityFilter', () => {
    let actor: ActorQueryOperationDistinctIdentity;

    beforeEach(() => {
      actor = new ActorQueryOperationDistinctIdentity(
        { name: 'actor', bus, mediatorQueryOperation: mediatorQueryOperationBindings },
      );
    });
    it('should create a filter', async() => {
      await expect(actor.newIdentityFilter([ DF.variable('a') ])).resolves.toBeInstanceOf(Function);
    });

    it('should create a filter that is a predicate', async() => {
      const filter = await actor.newIdentityFilter([ DF.variable('a') ]);
      expect(filter(BF.bindings([[ DF.variable('a'), DF.literal('a') ]]))).toBe(true);
    });

    it('should create a filter that only returns true once for equal objects', async() => {
      const filter = await actor.newIdentityFilter([ DF.variable('a') ]);
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
      const filter1 = await actor.newIdentityFilter([ DF.variable('a') ]);
      const filter2 = await actor.newIdentityFilter([ DF.variable('a') ]);
      const filter3 = await actor.newIdentityFilter([ DF.variable('a') ]);
      expect(filter1(BF.bindings([[ DF.variable('a'), DF.literal('b') ]]))).toBe(true);
      expect(filter1(BF.bindings([[ DF.variable('a'), DF.literal('b') ]]))).toBe(false);

      expect(filter2(BF.bindings([[ DF.variable('a'), DF.literal('b') ]]))).toBe(true);
      expect(filter2(BF.bindings([[ DF.variable('a'), DF.literal('b') ]]))).toBe(false);

      expect(filter3(BF.bindings([[ DF.variable('a'), DF.literal('b') ]]))).toBe(true);
      expect(filter3(BF.bindings([[ DF.variable('a'), DF.literal('b') ]]))).toBe(false);
    });
  });

  describe('#newIdentityFilterQuads', () => {
    let actor: ActorQueryOperationDistinctIdentity;

    beforeEach(() => {
      actor = new ActorQueryOperationDistinctIdentity(
        { name: 'actor', bus, mediatorQueryOperation: mediatorQueryOperationBindings },
      );
    });
    it('should create a filter', async() => {
      await expect(actor.newIdentityFilterQuads()).resolves.toBeInstanceOf(Function);
    });

    it('should create a filter that is a predicate', async() => {
      const filter = await actor.newIdentityFilterQuads();
      expect(filter(DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o')))).toBe(true);
    });

    it('should create a filter that only returns true once for equal objects', async() => {
      const filter = await actor.newIdentityFilterQuads();
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
      const filter1 = await actor.newIdentityFilterQuads();
      const filter2 = await actor.newIdentityFilterQuads();
      const filter3 = await actor.newIdentityFilterQuads();
      expect(filter1(DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')))).toBe(true);
      expect(filter1(DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')))).toBe(false);

      expect(filter2(DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')))).toBe(true);
      expect(filter2(DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')))).toBe(false);

      expect(filter3(DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')))).toBe(true);
      expect(filter3(DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')))).toBe(false);
    });
  });

  describe('An ActorQueryOperationDistinctIdentity instance', () => {
    let actor: ActorQueryOperationDistinctIdentity;
    beforeEach(() => {
      actor = new ActorQueryOperationDistinctIdentity(
        { name: 'actor', bus, mediatorQueryOperation: mediatorQueryOperationBindings },
      );
    });

    it('should test on distinct', async() => {
      const op: any = { operation: { type: 'distinct' }, context: new ActionContext() };
      await expect(actor.test(op)).resolves.toPassTestVoid();
    });

    it('should not test on non-distinct', async() => {
      const op: any = { operation: { type: 'some-other-type' }, context: new ActionContext() };
      await expect(actor.test(op)).resolves.toFailTest(`Actor actor only supports distinct operations, but got some-other-type`);
    });

    describe('with bindings input', () => {
      it('should handle bindings', async() => {
        actor = new ActorQueryOperationDistinctIdentity(
          { name: 'actor', bus, mediatorQueryOperation: mediatorQueryOperationBindings },
        );
        const op: any = { operation: { type: 'distinct' }, context: new ActionContext() };
        const output = getSafeBindings(await actor.run(op, undefined));
        await expect(output.metadata()).resolves.toEqual({
          cardinality: 5,
          variables: [{ variable: DF.variable('a') }],
        });
        expect(output.type).toBe('bindings');
        await expect(output.bindingsStream).toEqualBindingsStream([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ]);
      });
    });

    describe('with quad input', () => {
      it('should filter duplicate quads', async() => {
        actor = new ActorQueryOperationDistinctIdentity(
          { name: 'actor', bus, mediatorQueryOperation: mediatorQueryOperationQuads },
        );
        const op: any = { operation: { type: 'distinct' }, context: new ActionContext() };
        const output = getSafeQuads(await actor.run(op, undefined));
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
