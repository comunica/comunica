import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { ActionContext, Bus } from '@comunica/core';
import type { IJoinEntry } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
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
          cardinality: { type: 'exact', value: 3 },
          variables: [{ variable: DF.variable('a'), canBeUndef: false }],
        }),
        operated: arg,
        type: 'bindings',
      }),
    };
    mediatorJoin = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new UnionIterator(
          arg.entries.map((entry: IJoinEntry) => entry.output.bindingsStream),
          { autoStart: false },
        ),
        metadata: () => Promise.resolve({
          cardinality: { type: 'exact', value: 100 },
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
        cardinality: { type: 'exact', value: 100 },
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
    it('should return empty when one of the join entries has an estimated cardinality of 0', async() => {
      // ActorRdfJoinMultiEmpty accepts a cardinality of zero of any type and always wins the cost
      // comparison, so mediating this join can only produce an empty stream. It is short-circuited here.
      mediatorQueryOperation.mediate = (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({
          cardinality: { type: 'estimate', value: 0 },
          variables: [{ variable: DF.variable('a'), canBeUndef: false }],
        }),
        operated: arg,
        type: 'bindings',
      });

      const joinSpy = jest.spyOn(mediatorJoin, 'mediate');
      const op: any = { operation: { type: 'join', input: [{}, {}, {}]}, context: new ActionContext() };
      const output = getSafeBindings(await actor.run(op, undefined));
      expect(output.type).toBe('bindings');
      await expect(output.metadata()).resolves.toEqual({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'exact', value: 0 },
        variables: [
          { variable: DF.variable('a'), canBeUndef: false },
        ],
      });
      await expect(output.bindingsStream).toEqualBindingsStream([]);
      expect(joinSpy).not.toHaveBeenCalled();
    });

    it('should still mediate the join for a non-zero estimated cardinality', async() => {
      mediatorQueryOperation.mediate = (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({
          cardinality: { type: 'estimate', value: 1 },
          variables: [{ variable: DF.variable('a'), canBeUndef: false }],
        }),
        operated: arg,
        type: 'bindings',
      });

      const joinSpy = jest.spyOn(mediatorJoin, 'mediate');
      const op: any = { operation: { type: 'join', input: [{}, {}, {}]}, context: new ActionContext() };
      const output = getSafeBindings(await actor.run(op, undefined));
      expect(joinSpy).toHaveBeenCalledTimes(1);
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'exact', value: 100 },
        variables: [
          { variable: DF.variable('a'), canBeUndef: false },
          { variable: DF.variable('b'), canBeUndef: false },
        ],
      });
    });

    it('should not evaluate join entries after an empty one', async() => {
      const variablesPerEntry = [ DF.variable('a'), DF.variable('b'), DF.variable('c') ];
      let evaluated = 0;
      mediatorQueryOperation.mediate = (arg: any) => {
        const variable = variablesPerEntry[evaluated++];
        return Promise.resolve({
          bindingsStream: new ArrayIterator([], { autoStart: false }),
          metadata: () => Promise.resolve({
            cardinality: { type: 'exact', value: evaluated === 1 ? 0 : 3 },
            variables: [{ variable, canBeUndef: false }],
          }),
          operated: arg,
          type: 'bindings',
        });
      };

      const op: any = { operation: { type: 'join', input: [{}, {}, {}]}, context: new ActionContext() };
      const output = getSafeBindings(await actor.run(op, undefined));
      expect(evaluated).toBe(1);
      await expect(output.bindingsStream).toEqualBindingsStream([]);
      expect(evaluated).toBe(1);
    });

    it('should determine the variables of the skipped entries when the metadata is requested', async() => {
      const variablesPerEntry = [ DF.variable('a'), DF.variable('b'), DF.variable('c') ];
      let evaluated = 0;
      mediatorQueryOperation.mediate = (arg: any) => {
        const variable = variablesPerEntry[evaluated++];
        return Promise.resolve({
          bindingsStream: new ArrayIterator([], { autoStart: false }),
          metadata: () => Promise.resolve({
            cardinality: { type: 'exact', value: evaluated === 1 ? 0 : 3 },
            variables: [{ variable, canBeUndef: false }],
          }),
          operated: arg,
          type: 'bindings',
        });
      };

      const op: any = { operation: { type: 'join', input: [{}, {}, {}]}, context: new ActionContext() };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toEqual({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'exact', value: 0 },
        variables: [
          { variable: DF.variable('a'), canBeUndef: false },
          { variable: DF.variable('b'), canBeUndef: false },
          { variable: DF.variable('c'), canBeUndef: false },
        ],
      });
      expect(evaluated).toBe(3);

      // Requesting the metadata again must not evaluate the skipped entries again
      await expect(output.metadata()).resolves.toEqual({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'exact', value: 0 },
        variables: [
          { variable: DF.variable('a'), canBeUndef: false },
          { variable: DF.variable('b'), canBeUndef: false },
          { variable: DF.variable('c'), canBeUndef: false },
        ],
      });
      expect(evaluated).toBe(3);
    });

    it('should run when one of the join entries is empty', async() => {
      mediatorQueryOperation.mediate = (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([], { autoStart: false }),
        metadata: () => Promise.resolve({
          cardinality: { type: 'exact', value: 0 },
          variables: [{ variable: DF.variable('a'), canBeUndef: false }],
        }),
        operated: arg,
        type: 'bindings',
      });

      const op: any = { operation: { type: 'join', input: [{}, {}, {}]}, context: new ActionContext() };
      const output = getSafeBindings(await actor.run(op, undefined));
      expect(output.type).toBe('bindings');
      await expect(output.metadata()).resolves.toEqual({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'exact', value: 0 },
        variables: [
          { variable: DF.variable('a'), canBeUndef: false },
        ],
      });
      await expect(output.bindingsStream).toEqualBindingsStream([]);
    });
  });
});
