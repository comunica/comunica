import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActionRdfJoinSelectivity, IActorRdfJoinSelectivityOutput } from '@comunica/bus-rdf-join-selectivity';
import { KeysInitQuery } from '@comunica/context-entries';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import { ActionContext, Bus } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import { MetadataValidationState } from '@comunica/metadata';
import type { IPhysicalQueryPlanLogger, IPlanNode, MetadataBindings } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { BufferedIterator, MultiTransformIterator, SingletonIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import type { IActionRdfJoin } from '../lib/ActorRdfJoin';
import { ActorRdfJoin } from '../lib/ActorRdfJoin';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

// Dummy class to test instance of abstract class
class Dummy extends ActorRdfJoin {
  // Just here to have a valid dummy class
  public constructor(
    mediatorJoinSelectivity: Mediator<
    Actor<IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>,
    IActionRdfJoinSelectivity,
IActorTest,
IActorRdfJoinSelectivityOutput
>,
    limitEntries?: number,
    limitEntriesMin?: boolean,
    canHandleUndefs?: boolean,
  ) {
    super(
      { name: 'name', bus: new Bus({ name: 'bus' }), mediatorJoinSelectivity },
      {
        logicalType: 'inner',
        physicalName: 'PHYSICAL',
        limitEntries,
        limitEntriesMin,
        canHandleUndefs,
      },
    );
  }

  public async getOutput(action: IActionRdfJoin) {
    const bufferedIterator = new BufferedIterator({ autoStart: false });
    (<any> bufferedIterator)._read = (count: number, done: any) => {
      (<any> bufferedIterator)._push(BF.fromRecord({ a: DF.namedNode('a') }));
      bufferedIterator.close();
      done();
    };
    const result = <any> {
      dummy: 'dummy',
      bindingsStream: new MultiTransformIterator(
        bufferedIterator,
        {
          multiTransform: bindings => new SingletonIterator(bindings),
        },
      ),
    };

    result.metadata = async() => this.constructResultMetadata(
      action.entries,
      await Dummy.getMetadatas(action.entries),
      action.context,
    );

    return { result, physicalPlanMetadata: { meta: true }};
  }

  protected getJoinCoefficients(
    action: IActionRdfJoin,
    metadatas: MetadataBindings[],
  ): Promise<IMediatorTypeJoinCoefficients> {
    return Promise.resolve({
      iterations: 5,
      persistedItems: 2,
      blockingItems: 3,
      requestTime: 10,
    });
  }
}

describe('ActorRdfJoin', () => {
  let action: IActionRdfJoin;
  let mediatorJoinSelectivity: Mediator<
  Actor<IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>,
  IActionRdfJoinSelectivity,
IActorTest,
IActorRdfJoinSelectivityOutput
>;
  let variables0: RDF.Variable[];
  let variables1: RDF.Variable[];

  beforeEach(() => {
    mediatorJoinSelectivity = <any> {
      mediate: async() => ({ selectivity: 0.8 }),
    };
    variables0 = [];
    variables1 = [];
    action = {
      type: 'inner',
      entries: [
        {
          output: {
            bindingsStream: <any>null,
            type: 'bindings',
            metadata: async() => ({
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 10 },
              canContainUndefs: false,
              variables: variables0,
            }),
          },
          operation: <any>{},
        },
        {
          output: {
            bindingsStream: <any>null,
            type: 'bindings',
            metadata: async() => ({
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 5 },
              canContainUndefs: false,
              variables: variables1,
            }),
          },
          operation: <any>{},
        },
      ],
      context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
    };
  });

  describe('hash', () => {
    it('should hash to concatenation of values of variables', () => {
      expect(ActorRdfJoin.hash(
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('http://www.example.org/instance#a') ],
          [ DF.variable('y'), DF.literal('XYZ', DF.namedNode('ex:abc')) ],
        ]),
        [ DF.variable('x'), DF.variable('y') ],
      )).toBe('http://www.example.org/instance#aXYZ');
    });

    it('should not let hash being influenced by a variable that is not present in bindings', () => {
      expect(ActorRdfJoin.hash(
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('http://www.example.org/instance#a') ],
          [ DF.variable('y'), DF.literal('XYZ', DF.namedNode('ex:abc')) ],
        ]),
        [ DF.variable('x'), DF.variable('y'), DF.variable('z') ],
      )).toBe('http://www.example.org/instance#aXYZ');
    });
  });

  describe('hashNonClashing', () => {
    it('should hash to concatenation of values of variables', () => {
      expect(ActorRdfJoin.hashNonClashing(
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('http://www.example.org/instance#a') ],
          [ DF.variable('y'), DF.literal('XYZ', DF.namedNode('ex:abc')) ],
        ]),
        [ DF.variable('x'), DF.variable('y') ],
      )).toBe('http://www.example.org/instance#a"XYZ"^^ex:abc');
    });

    it('should not let hash being influenced by a variable that is not present in bindings', () => {
      expect(ActorRdfJoin.hashNonClashing(
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('http://www.example.org/instance#a') ],
          [ DF.variable('y'), DF.literal('XYZ', DF.namedNode('ex:abc')) ],
        ]),
        [ DF.variable('x'), DF.variable('y'), DF.variable('z') ],
      )).toBe('http://www.example.org/instance#a"XYZ"^^ex:abc');
    });
  });

  describe('overlappingVariables', () => {
    it('should return an empty array if there is no overlap', () => {
      expect(ActorRdfJoin.overlappingVariables([
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [],
        },
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [],
        },
      ])).toEqual([]);
      expect(ActorRdfJoin.overlappingVariables([
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [ DF.variable('a'), DF.variable('b') ],
        },
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [ DF.variable('c'), DF.variable('d') ],
        },
      ])).toEqual([]);
    });

    it('should return a correct array if there is overlap', () => {
      expect(ActorRdfJoin.overlappingVariables([
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [ DF.variable('a'), DF.variable('b') ],
        },
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [ DF.variable('a'), DF.variable('d') ],
        },
      ])).toEqual([ DF.variable('a') ]);

      expect(ActorRdfJoin.overlappingVariables([
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [ DF.variable('a'), DF.variable('b') ],
        },
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [ DF.variable('a'), DF.variable('b') ],
        },
      ])).toEqual([ DF.variable('a'), DF.variable('b') ]);

      expect(ActorRdfJoin.overlappingVariables([
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [ DF.variable('c'), DF.variable('b') ],
        },
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [ DF.variable('a'), DF.variable('b') ],
        },
      ])).toEqual([ DF.variable('b') ]);
    });
  });

  describe('joinVariables', () => {
    it('should join variables', () => {
      expect(ActorRdfJoin.joinVariables(DF, [
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [],
        },
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [],
        },
      ])).toEqual([]);

      expect(ActorRdfJoin.joinVariables(DF, [
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [ DF.variable('a'), DF.variable('b') ],
        },
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [ DF.variable('c'), DF.variable('d') ],
        },
      ])).toEqual([
        DF.variable('a'),
        DF.variable('b'),
        DF.variable('c'),
        DF.variable('d'),
      ]);
    });

    it('should deduplicate the result', () => {
      expect(ActorRdfJoin.joinVariables(DF, [
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [ DF.variable('a'), DF.variable('b') ],
        },
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [ DF.variable('b'), DF.variable('d') ],
        },
      ])).toEqual([ DF.variable('a'), DF.variable('b'), DF.variable('d') ]);

      expect(ActorRdfJoin.joinVariables(DF, [
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [ DF.variable('a'), DF.variable('b') ],
        },
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [ DF.variable('b'), DF.variable('a') ],
        },
      ])).toEqual([ DF.variable('a'), DF.variable('b') ]);
    });
  });

  describe('joinBindings', () => {
    it('should return for no bindings', () => {
      expect(ActorRdfJoin.joinBindings()).toBeNull();
    });

    it('should return for one binding', () => {
      const single = BF.bindings([
        [ DF.variable('x'), DF.literal('a') ],
        [ DF.variable('y'), DF.literal('b') ],
      ]);
      expect(ActorRdfJoin.joinBindings(single)).toEqual(single);
    });

    it('should return the right binding if the left is empty', () => {
      const left = BF.bindings();
      const right = BF.bindings([
        [ DF.variable('x'), DF.literal('a') ],
        [ DF.variable('y'), DF.literal('b') ],
      ]);
      expect(ActorRdfJoin.joinBindings(left, right)).toEqual(right);
    });

    it('should return the left binding if the right is empty', () => {
      const left = BF.bindings([
        [ DF.variable('x'), DF.literal('a') ],
        [ DF.variable('y'), DF.literal('b') ],
      ]);
      const right = BF.bindings();
      expect(ActorRdfJoin.joinBindings(left, right)).toEqual(left);
    });

    it('should join 2 bindings with no overlapping variables', () => {
      const left = BF.bindings([
        [ DF.variable('x'), DF.literal('a') ],
        [ DF.variable('y'), DF.literal('b') ],
      ]);
      const right = BF.bindings([
        [ DF.variable('v'), DF.literal('d') ],
        [ DF.variable('w'), DF.literal('e') ],
      ]);
      const result = BF.bindings([
        [ DF.variable('x'), DF.literal('a') ],
        [ DF.variable('y'), DF.literal('b') ],
        [ DF.variable('v'), DF.literal('d') ],
        [ DF.variable('w'), DF.literal('e') ],
      ]);
      expect(ActorRdfJoin.joinBindings(left, right)).toEqual(result);
    });

    it('should join 2 bindings with overlapping variables', () => {
      const left = BF.bindings([
        [ DF.variable('x'), DF.literal('a') ],
        [ DF.variable('y'), DF.literal('b') ],
      ]);
      const right = BF.bindings([
        [ DF.variable('x'), DF.literal('a') ],
        [ DF.variable('w'), DF.literal('e') ],
      ]);
      const result = BF.bindings([
        [ DF.variable('x'), DF.literal('a') ],
        [ DF.variable('y'), DF.literal('b') ],
        [ DF.variable('w'), DF.literal('e') ],
      ]);
      expect(ActorRdfJoin.joinBindings(left, right)).toEqual(result);
    });

    it('should not join bindings with conflicting mappings', () => {
      const left = BF.bindings([
        [ DF.variable('x'), DF.literal('a') ],
        [ DF.variable('y'), DF.literal('b') ],
      ]);
      const right = BF.bindings([
        [ DF.variable('x'), DF.literal('b') ],
        [ DF.variable('w'), DF.literal('e') ],
      ]);
      expect(ActorRdfJoin.joinBindings(left, right)).toBeNull();
    });
  });

  describe('getCardinality', () => {
    it('should handle 0 metadata', () => {
      expect(ActorRdfJoin.getCardinality(<any>{ cardinality: { type: 'exact', value: 0 }}))
        .toEqual({ type: 'exact', value: 0 });
    });

    it('should handle 5 metadata', () => {
      expect(ActorRdfJoin.getCardinality(<any>{ cardinality: { type: 'exact', value: 5 }}))
        .toEqual({ type: 'exact', value: 5 });
    });
  });

  describe('getMetadatas', () => {
    it('should handle no entries', async() => {
      await expect(ActorRdfJoin.getMetadatas([])).resolves.toEqual([]);
    });

    it('should handle entries', async() => {
      await expect(ActorRdfJoin.getMetadatas(action.entries)).resolves.toMatchObject([
        { cardinality: { type: 'estimate', value: 10 }, canContainUndefs: false, variables: []},
        { cardinality: { type: 'estimate', value: 5 }, canContainUndefs: false, variables: []},
      ]);
    });
  });

  describe('getRequestInitialTimes', () => {
    it('should calculate initial request times', async() => {
      expect(ActorRdfJoin.getRequestInitialTimes([
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 10 },
          pageSize: 10,
          requestTime: 10,
          canContainUndefs: false,
          variables: [],
        },
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 10 },
          pageSize: 10,
          canContainUndefs: false,
          variables: [],
        },
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [],
        },
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 10 },
          requestTime: 10,
          canContainUndefs: false,
          variables: [],
        },
      ])).toEqual([
        0,
        0,
        0,
        10,
      ]);
    });
  });

  describe('getRequestItemTimes', () => {
    it('should calculate item request times', async() => {
      expect(ActorRdfJoin.getRequestItemTimes([
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 10 },
          pageSize: 10,
          requestTime: 10,
          canContainUndefs: false,
          variables: [],
        },
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 10 },
          pageSize: 10,
          canContainUndefs: false,
          variables: [],
        },
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [],
        },
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 10 },
          requestTime: 10,
          canContainUndefs: false,
          variables: [],
        },
      ])).toEqual([
        1,
        0,
        0,
        0,
      ]);
    });
  });

  describe('constructResultMetadata', () => {
    let instance: Dummy;

    beforeEach(() => {
      instance = new Dummy(mediatorJoinSelectivity);
    });

    it('should return partial metadata if it is fully valid', async() => {
      const state = new MetadataValidationState();
      await expect(instance.constructResultMetadata([], [], action.context, {
        state,
        cardinality: { type: 'estimate', value: 10 },
        canContainUndefs: true,
        pageSize: 100,
      })).resolves.toEqual({
        state,
        cardinality: { type: 'estimate', value: 10 },
        canContainUndefs: true,
        pageSize: 100,
        variables: [],
      });
    });

    it('should return not use empty partial metadata', async() => {
      await expect(instance.constructResultMetadata([], [
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [],
        },
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 2 },
          canContainUndefs: true,
          variables: [],
        },
      ], action.context, {})).resolves.toEqual({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'estimate', value: 20 * 0.8 },
        canContainUndefs: true,
        variables: [],
      });
      await expect(instance.constructResultMetadata([], [
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: true,
          variables: [],
        },
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 2 },
          canContainUndefs: true,
          variables: [],
        },
      ], action.context, {})).resolves.toEqual({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'estimate', value: 20 * 0.8 },
        canContainUndefs: true,
        variables: [],
      });
      await expect(instance.constructResultMetadata([], [
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [],
        },
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 2 },
          canContainUndefs: false,
          variables: [],
        },
      ], action.context, {})).resolves.toEqual({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'estimate', value: 20 * 0.8 },
        canContainUndefs: false,
        variables: [],
      });
    });

    it('should combine exact cardinalities', async() => {
      await expect(instance.constructResultMetadata([], [
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'exact', value: 10 },
          canContainUndefs: false,
          variables: [],
        },
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'exact', value: 2 },
          canContainUndefs: true,
          variables: [],
        },
      ], action.context, {})).resolves.toEqual({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'exact', value: 20 * 0.8 },
        canContainUndefs: true,
        variables: [],
      });
    });

    it('should combine exact and estimate cardinalities', async() => {
      await expect(instance.constructResultMetadata([], [
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [],
        },
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'exact', value: 2 },
          canContainUndefs: true,
          variables: [],
        },
      ], action.context, {})).resolves.toEqual({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'estimate', value: 20 * 0.8 },
        canContainUndefs: true,
        variables: [],
      });
    });

    it('should join variables', async() => {
      await expect(instance.constructResultMetadata([], [
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'exact', value: 10 },
          canContainUndefs: false,
          variables: [ DF.variable('a') ],
        },
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'exact', value: 2 },
          canContainUndefs: true,
          variables: [ DF.variable('a'), DF.variable('b') ],
        },
      ], action.context, {})).resolves.toEqual({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'exact', value: 20 * 0.8 },
        canContainUndefs: true,
        variables: [ DF.variable('a'), DF.variable('b') ],
      });
    });

    it('should handle metadata invalidation', async() => {
      const state1 = new MetadataValidationState();
      const metadataOut = await instance.constructResultMetadata([], [
        {
          state: state1,
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [],
        },
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 2 },
          canContainUndefs: true,
          variables: [],
        },
      ], action.context, {});
      expect(metadataOut.state.valid).toBeTruthy();

      const invalidateLister = jest.fn();
      metadataOut.state.addInvalidateListener(invalidateLister);
      expect(invalidateLister).not.toHaveBeenCalled();

      // After invoking this, we expect the returned metadata to also be invalidated
      state1.invalidate();
      expect(metadataOut.state.valid).toBeFalsy();
      expect(invalidateLister).toHaveBeenCalledTimes(1);
    });
  });

  describe('test', () => {
    let instance: Dummy;

    beforeEach(() => {
      instance = new Dummy(mediatorJoinSelectivity);
    });

    it('should reject if the logical type does not match', async() => {
      action.type = 'optional';
      await expect(instance.test(action)).rejects.toThrow(`name can only handle logical joins of type 'inner', while 'optional' was given.`);
    });

    it('should reject if there are 0 entries', async() => {
      action.entries = [];
      await expect(instance.test(action)).rejects.toThrow('name requires at least two join entries.');
    });

    it('should reject if there is 1 entry', async() => {
      action.entries = [ action.entries[0] ];
      await expect(instance.test(action)).rejects.toThrow('name requires at least two join entries.');
    });

    it('should reject if there are too many entries', async() => {
      action.entries.push(<any> { bindings: { type: 'bindings' }});
      instance = new Dummy(mediatorJoinSelectivity, 2);
      await expect(instance.test(action)).rejects.toThrow(`name requires 2 join entries at most. The input contained 3.`);
    });

    it('should reject if there are too few entries', async() => {
      instance = new Dummy(mediatorJoinSelectivity, 3, true);
      await expect(instance.test(action)).rejects.toThrow(`name requires 3 join entries at least. The input contained 2.`);
    });

    it('should throw an error if an entry has an incorrect type', async() => {
      action.entries.push(<any> { output: { type: 'invalid' }});
      action.entries.push(<any> { output: { type: 'invalid' }});
      instance = new Dummy(mediatorJoinSelectivity, 99);
      await expect(instance.test(action)).rejects
        .toThrow(`Invalid type of a join entry: Expected 'bindings' but got 'invalid'`);
    });

    it('should return a value if both metadata objects are present', async() => {
      action.entries[0].output.metadata = () => Promise.resolve({
        state: new MetadataValidationState(),
        cardinality: { type: 'estimate', value: 5 },
        canContainUndefs: false,
        variables: [],
      });
      action.entries[1].output.metadata = () => Promise.resolve({
        state: new MetadataValidationState(),
        cardinality: { type: 'estimate', value: 5 },
        canContainUndefs: false,
        variables: [],
      });
      await expect(instance.test(action)).resolves.toHaveProperty('iterations', 5);
    });

    it('should fail on undefs in left stream', async() => {
      action.entries[0].output.metadata = () => Promise.resolve({
        state: new MetadataValidationState(),
        cardinality: { type: 'estimate', value: 5 },
        canContainUndefs: true,
        variables: [],
      });
      await expect(instance.test(action)).rejects
        .toThrow(new Error('Actor name can not join streams containing undefs'));
    });

    it('should fail on undefs in right stream', async() => {
      action.entries[1].output.metadata = () => Promise.resolve({
        state: new MetadataValidationState(),
        cardinality: { type: 'estimate', value: 5 },
        canContainUndefs: true,
        variables: [],
      });
      await expect(instance.test(action)).rejects
        .toThrow(new Error('Actor name can not join streams containing undefs'));
    });

    it('should fail on undefs in left and right stream', async() => {
      action.entries[0].output.metadata = () => Promise.resolve({
        state: new MetadataValidationState(),
        cardinality: { type: 'estimate', value: 5 },
        canContainUndefs: true,
        variables: [],
      });
      action.entries[1].output.metadata = () => Promise.resolve({
        state: new MetadataValidationState(),
        cardinality: { type: 'estimate', value: 5 },
        canContainUndefs: true,
        variables: [],
      });
      await expect(instance.test(action)).rejects
        .toThrow(new Error('Actor name can not join streams containing undefs'));
    });
  });

  describe('test with undefs', () => {
    const instance = new Dummy(mediatorJoinSelectivity, undefined, undefined, true);

    it('should handle undefs in left stream', async() => {
      action.entries[0].output.metadata = () => Promise.resolve({
        state: new MetadataValidationState(),
        cardinality: { type: 'estimate', value: 5 },
        canContainUndefs: true,
        variables: [],
      });
      await expect(instance.test(action)).resolves
        .toEqual({
          iterations: 5,
          persistedItems: 2,
          blockingItems: 3,
          requestTime: 10,
        });
    });

    it('should handle undefs in right stream', async() => {
      action.entries[1].output.metadata = () => Promise.resolve({
        state: new MetadataValidationState(),
        cardinality: { type: 'estimate', value: 5 },
        canContainUndefs: true,
        variables: [],
      });
      await expect(instance.test(action)).resolves
        .toEqual({
          iterations: 5,
          persistedItems: 2,
          blockingItems: 3,
          requestTime: 10,
        });
    });

    it('should handle undefs in left and right stream', async() => {
      action.entries[0].output.metadata = () => Promise.resolve({
        state: new MetadataValidationState(),
        cardinality: { type: 'estimate', value: 5 },
        canContainUndefs: true,
        variables: [],
      });
      action.entries[1].output.metadata = () => Promise.resolve({
        state: new MetadataValidationState(),
        cardinality: { type: 'estimate', value: 5 },
        canContainUndefs: true,
        variables: [],
      });
      await expect(instance.test(action)).resolves
        .toEqual({
          iterations: 5,
          persistedItems: 2,
          blockingItems: 3,
          requestTime: 10,
        });
    });
  });

  describe('run', () => {
    let instance: Dummy;

    beforeEach(() => {
      instance = new Dummy(mediatorJoinSelectivity);
    });

    it('calls getOutput if there are 2+ entries', async() => {
      const runOutput = await instance.run(action);
      const innerOutput = (await instance.getOutput(action)).result;
      expect((<any> runOutput).dummy).toEqual(innerOutput.dummy);
      await expect(runOutput.metadata()).resolves.toEqual({
        ...await innerOutput.metadata(),
        state: expect.any(MetadataValidationState),
      });
    });

    it('calculates cardinality if metadata is supplied', async() => {
      action.entries[0].output.metadata = () => Promise.resolve({
        state: new MetadataValidationState(),
        cardinality: { type: 'estimate', value: 5 },
        canContainUndefs: true,
        variables: [],
      });
      action.entries[1].output.metadata = () => Promise.resolve({
        state: new MetadataValidationState(),
        cardinality: { type: 'estimate', value: 10 },
        canContainUndefs: true,
        variables: [],
      });
      await instance.run(action).then(async(result: any) => {
        return await expect(result.metadata()).resolves.toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: 40 },
          canContainUndefs: true,
          variables: [],
        });
      });
    });

    it('invokes the physicalQueryPlanLogger', async() => {
      const parentNode = '';
      const logger: IPhysicalQueryPlanLogger = {
        logOperation: jest.fn(),
        toJson: jest.fn(),
        stashChildren: jest.fn((node, filter) => filter ? filter(<IPlanNode> { logicalOperator: 'abc' }) : undefined),
        unstashChild: jest.fn(),
        appendMetadata: jest.fn(),
      };
      action.context = new ActionContext({
        [KeysInitQuery.physicalQueryPlanLogger.name]: logger,
        [KeysInitQuery.physicalQueryPlanNode.name]: parentNode,
      });
      jest.spyOn(instance, 'getOutput');

      const result = await instance.run(action);
      await result.bindingsStream.toArray();
      await new Promise(setImmediate);

      expect(logger.logOperation).toHaveBeenCalledWith(
        'join-inner',
        'PHYSICAL',
        action,
        parentNode,
        'name',
        {
          meta: true,
          cardinalities: [
            { type: 'estimate', value: 10 },
            { type: 'estimate', value: 5 },
          ],
          joinCoefficients: {
            iterations: 5,
            persistedItems: 2,
            blockingItems: 3,
            requestTime: 10,
          },
        },
      );
      expect(logger.appendMetadata).toHaveBeenCalledWith({}, {
        cardinality: { type: 'estimate', value: 10 },
      });
      expect(logger.appendMetadata).toHaveBeenCalledWith({}, {
        cardinality: { type: 'estimate', value: 5 },
      });
      expect(logger.appendMetadata).toHaveBeenCalledWith(expect.anything(), {
        cardinalityReal: 1,
        timeLife: expect.anything(),
        timeSelf: expect.anything(),
      });
      expect(instance.getOutput).toHaveBeenCalledWith({
        ...action,
        context: new ActionContext({
          [KeysInitQuery.physicalQueryPlanLogger.name]: logger,
          [KeysInitQuery.physicalQueryPlanNode.name]: action,
        }),
      });
    });
  });
});
