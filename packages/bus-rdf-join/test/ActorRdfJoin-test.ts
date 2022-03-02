import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActionRdfJoinSelectivity, IActorRdfJoinSelectivityOutput } from '@comunica/bus-rdf-join-selectivity';
import { KeysInitQuery } from '@comunica/context-entries';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import { ActionContext, Bus } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { IPhysicalQueryPlanLogger, MetadataBindings } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import type { IActionRdfJoin } from '../lib/ActorRdfJoin';
import { ActorRdfJoin } from '../lib/ActorRdfJoin';

const DF = new DataFactory();
const BF = new BindingsFactory();

// Dummy class to test instance of abstract class
class Dummy extends ActorRdfJoin {
  // Just here to have a valid dummy class
  public constructor(
    mediatorJoinSelectivity: Mediator<
    Actor<IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>,
    IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>,
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
    const result = <any> { dummy: 'dummy' };

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
  IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>;
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
              cardinality: { type: 'estimate', value: 5 },
              canContainUndefs: false,
              variables: variables1,
            }),
          },
          operation: <any>{},
        },
      ],
      context: new ActionContext(),
    };
  });

  describe('hash', () => {
    it('should hash to concatenation of values of variables', () => {
      expect(ActorRdfJoin.hash(
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('http://www.example.org/instance#a') ],
          [ DF.variable('y'), DF.literal('XYZ', DF.namedNode('ex:abc')) ],
        ]), [ DF.variable('x'), DF.variable('y') ],
      )).toEqual('http://www.example.org/instance#a"XYZ"^^ex:abc');
    });

    it('should not let hash being influenced by a variable that is not present in bindings', () => {
      expect(ActorRdfJoin.hash(
        BF.bindings([
          [ DF.variable('x'), DF.namedNode('http://www.example.org/instance#a') ],
          [ DF.variable('y'), DF.literal('XYZ', DF.namedNode('ex:abc')) ],
        ]), [ DF.variable('x'), DF.variable('y'), DF.variable('z') ],
      )).toEqual('http://www.example.org/instance#a"XYZ"^^ex:abc');
    });
  });

  describe('overlappingVariables', () => {
    it('should return an empty array if there is no overlap', () => {
      expect(ActorRdfJoin.overlappingVariables([
        { cardinality: { type: 'estimate', value: 10 }, canContainUndefs: false, variables: []},
        { cardinality: { type: 'estimate', value: 10 }, canContainUndefs: false, variables: []},
      ])).toEqual([]);
      expect(ActorRdfJoin.overlappingVariables([
        {
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [ DF.variable('a'), DF.variable('b') ],
        },
        {
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [ DF.variable('c'), DF.variable('d') ],
        },
      ])).toEqual([]);
    });

    it('should return a correct array if there is overlap', () => {
      expect(ActorRdfJoin.overlappingVariables([
        {
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [ DF.variable('a'), DF.variable('b') ],
        },
        {
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [ DF.variable('a'), DF.variable('d') ],
        },
      ])).toEqual([ DF.variable('a') ]);

      expect(ActorRdfJoin.overlappingVariables([
        {
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [ DF.variable('a'), DF.variable('b') ],
        },
        {
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [ DF.variable('a'), DF.variable('b') ],
        },
      ])).toEqual([ DF.variable('a'), DF.variable('b') ]);

      expect(ActorRdfJoin.overlappingVariables([
        {
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [ DF.variable('c'), DF.variable('b') ],
        },
        {
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [ DF.variable('a'), DF.variable('b') ],
        },
      ])).toEqual([ DF.variable('b') ]);
    });
  });

  describe('joinVariables', () => {
    it('should join variables', () => {
      expect(ActorRdfJoin.joinVariables([
        {
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [],
        },
        {
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [],
        },
      ])).toEqual([]);

      expect(ActorRdfJoin.joinVariables([
        {
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [ DF.variable('a'), DF.variable('b') ],
        },
        {
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
      expect(ActorRdfJoin.joinVariables([
        {
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [ DF.variable('a'), DF.variable('b') ],
        },
        {
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [ DF.variable('b'), DF.variable('d') ],
        },
      ])).toEqual([ DF.variable('a'), DF.variable('b'), DF.variable('d') ]);

      expect(ActorRdfJoin.joinVariables([
        {
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [ DF.variable('a'), DF.variable('b') ],
        },
        {
          cardinality: { type: 'estimate', value: 10 },
          canContainUndefs: false,
          variables: [ DF.variable('b'), DF.variable('a') ],
        },
      ])).toEqual([ DF.variable('a'), DF.variable('b') ]);
    });
  });

  describe('joinBindings', () => {
    it('should return for no bindings', () => {
      return expect(ActorRdfJoin.joinBindings()).toBeNull();
    });

    it('should return for one binding', () => {
      const single = BF.bindings([
        [ DF.variable('x'), DF.literal('a') ],
        [ DF.variable('y'), DF.literal('b') ],
      ]);
      return expect(ActorRdfJoin.joinBindings(single)).toEqual(single);
    });

    it('should return the right binding if the left is empty', () => {
      const left = BF.bindings();
      const right = BF.bindings([
        [ DF.variable('x'), DF.literal('a') ],
        [ DF.variable('y'), DF.literal('b') ],
      ]);
      return expect(ActorRdfJoin.joinBindings(left, right)).toEqual(right);
    });

    it('should return the left binding if the right is empty', () => {
      const left = BF.bindings([
        [ DF.variable('x'), DF.literal('a') ],
        [ DF.variable('y'), DF.literal('b') ],
      ]);
      const right = BF.bindings();
      return expect(ActorRdfJoin.joinBindings(left, right)).toEqual(left);
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
      return expect(ActorRdfJoin.joinBindings(left, right)).toEqual(result);
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
      return expect(ActorRdfJoin.joinBindings(left, right)).toEqual(result);
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
      return expect(ActorRdfJoin.joinBindings(left, right)).toBeNull();
    });
  });

  describe('getCardinality', () => {
    it('should handle 0 metadata', () => {
      return expect(ActorRdfJoin.getCardinality(<any>{ cardinality: { type: 'exact', value: 0 }}))
        .toEqual({ type: 'exact', value: 0 });
    });

    it('should handle 5 metadata', () => {
      return expect(ActorRdfJoin.getCardinality(<any>{ cardinality: { type: 'exact', value: 5 }}))
        .toEqual({ type: 'exact', value: 5 });
    });
  });

  describe('getMetadatas', () => {
    it('should handle no entries', async() => {
      expect(await ActorRdfJoin.getMetadatas([])).toEqual([]);
    });

    it('should handle entries', async() => {
      expect(await ActorRdfJoin.getMetadatas(action.entries)).toEqual([
        { cardinality: { type: 'estimate', value: 10 }, canContainUndefs: false, variables: []},
        { cardinality: { type: 'estimate', value: 5 }, canContainUndefs: false, variables: []},
      ]);
    });
  });

  describe('getRequestInitialTimes', () => {
    it('should calculate initial request times', async() => {
      expect(ActorRdfJoin.getRequestInitialTimes([
        {
          cardinality: { type: 'estimate', value: 10 },
          pageSize: 10,
          requestTime: 10,
          canContainUndefs: false,
          variables: [],
        },
        { cardinality: { type: 'estimate', value: 10 }, pageSize: 10, canContainUndefs: false, variables: []},
        { cardinality: { type: 'estimate', value: 10 }, canContainUndefs: false, variables: []},
        { cardinality: { type: 'estimate', value: 10 }, requestTime: 10, canContainUndefs: false, variables: []},
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
          cardinality: { type: 'estimate', value: 10 },
          pageSize: 10,
          requestTime: 10,
          canContainUndefs: false,
          variables: [],
        },
        { cardinality: { type: 'estimate', value: 10 }, pageSize: 10, canContainUndefs: false, variables: []},
        { cardinality: { type: 'estimate', value: 10 }, canContainUndefs: false, variables: []},
        { cardinality: { type: 'estimate', value: 10 }, requestTime: 10, canContainUndefs: false, variables: []},
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
      expect(await instance.constructResultMetadata([], [], action.context, {
        cardinality: { type: 'estimate', value: 10 },
        canContainUndefs: true,
        pageSize: 100,
      })).toEqual({
        cardinality: { type: 'estimate', value: 10 },
        canContainUndefs: true,
        pageSize: 100,
        variables: [],
      });
    });

    it('should return not use empty partial metadata', async() => {
      expect(await instance.constructResultMetadata([], [
        { cardinality: { type: 'estimate', value: 10 }, canContainUndefs: false, variables: []},
        { cardinality: { type: 'estimate', value: 2 }, canContainUndefs: true, variables: []},
      ], action.context, {})).toEqual({
        cardinality: { type: 'estimate', value: 20 * 0.8 },
        canContainUndefs: true,
        variables: [],
      });
      expect(await instance.constructResultMetadata([], [
        { cardinality: { type: 'estimate', value: 10 }, canContainUndefs: true, variables: []},
        { cardinality: { type: 'estimate', value: 2 }, canContainUndefs: true, variables: []},
      ], action.context, {})).toEqual({
        cardinality: { type: 'estimate', value: 20 * 0.8 },
        canContainUndefs: true,
        variables: [],
      });
      expect(await instance.constructResultMetadata([], [
        { cardinality: { type: 'estimate', value: 10 }, canContainUndefs: false, variables: []},
        { cardinality: { type: 'estimate', value: 2 }, canContainUndefs: false, variables: []},
      ], action.context, {})).toEqual({
        cardinality: { type: 'estimate', value: 20 * 0.8 },
        canContainUndefs: false,
        variables: [],
      });
    });

    it('should combine exact cardinalities', async() => {
      expect(await instance.constructResultMetadata([], [
        { cardinality: { type: 'exact', value: 10 }, canContainUndefs: false, variables: []},
        { cardinality: { type: 'exact', value: 2 }, canContainUndefs: true, variables: []},
      ], action.context, {})).toEqual({
        cardinality: { type: 'exact', value: 20 * 0.8 },
        canContainUndefs: true,
        variables: [],
      });
    });

    it('should combine exact and estimate cardinalities', async() => {
      expect(await instance.constructResultMetadata([], [
        { cardinality: { type: 'estimate', value: 10 }, canContainUndefs: false, variables: []},
        { cardinality: { type: 'exact', value: 2 }, canContainUndefs: true, variables: []},
      ], action.context, {})).toEqual({
        cardinality: { type: 'estimate', value: 20 * 0.8 },
        canContainUndefs: true,
        variables: [],
      });
    });

    it('should join variables', async() => {
      expect(await instance.constructResultMetadata([], [
        { cardinality: { type: 'exact', value: 10 }, canContainUndefs: false, variables: [ DF.variable('a') ]},
        {
          cardinality: { type: 'exact', value: 2 },
          canContainUndefs: true,
          variables: [ DF.variable('a'), DF.variable('b') ],
        },
      ], action.context, {})).toEqual({
        cardinality: { type: 'exact', value: 20 * 0.8 },
        canContainUndefs: true,
        variables: [ DF.variable('a'), DF.variable('b') ],
      });
    });
  });

  describe('test', () => {
    let instance: Dummy;

    beforeEach(() => {
      instance = new Dummy(mediatorJoinSelectivity);
    });

    it('should reject if the logical type does not match', () => {
      action.type = 'optional';
      return expect(instance.test(action)).rejects.toThrow(`name can only handle logical joins of type 'inner', while 'optional' was given.`);
    });

    it('should reject if there are 0 entries', () => {
      action.entries = [];
      return expect(instance.test(action)).rejects.toThrow('name requires at least two join entries.');
    });

    it('should reject if there is 1 entry', () => {
      action.entries = [ action.entries[0] ];
      return expect(instance.test(action)).rejects.toThrow('name requires at least two join entries.');
    });

    it('should reject if there are too many entries', () => {
      action.entries.push(<any> { bindings: { type: 'bindings' }});
      instance = new Dummy(mediatorJoinSelectivity, 2);
      return expect(instance.test(action)).rejects.toThrowError(`name requires 2 join entries at most. The input contained 3.`);
    });

    it('should reject if there are too few entries', () => {
      instance = new Dummy(mediatorJoinSelectivity, 3, true);
      return expect(instance.test(action)).rejects.toThrowError(`name requires 3 join entries at least. The input contained 2.`);
    });

    it('should throw an error if an entry has an incorrect type', () => {
      action.entries.push(<any> { output: { type: 'invalid' }});
      action.entries.push(<any> { output: { type: 'invalid' }});
      instance = new Dummy(mediatorJoinSelectivity, 99);
      return expect(instance.test(action)).rejects
        .toThrowError(`Invalid type of a join entry: Expected 'bindings' but got 'invalid'`);
    });

    it('should return a value if both metadata objects are present', () => {
      action.entries[0].output.metadata = () => Promise.resolve({
        cardinality: { type: 'estimate', value: 5 },
        canContainUndefs: false,
        variables: [],
      });
      action.entries[1].output.metadata = () => Promise.resolve({
        cardinality: { type: 'estimate', value: 5 },
        canContainUndefs: false,
        variables: [],
      });
      return expect(instance.test(action)).resolves.toHaveProperty('iterations', 5);
    });

    it('should fail on undefs in left stream', () => {
      action.entries[0].output.metadata = () => Promise.resolve({
        cardinality: { type: 'estimate', value: 5 },
        canContainUndefs: true,
        variables: [],
      });
      return expect(instance.test(action)).rejects
        .toThrow(new Error('Actor name can not join streams containing undefs'));
    });

    it('should fail on undefs in right stream', () => {
      action.entries[1].output.metadata = () => Promise.resolve({
        cardinality: { type: 'estimate', value: 5 },
        canContainUndefs: true,
        variables: [],
      });
      return expect(instance.test(action)).rejects
        .toThrow(new Error('Actor name can not join streams containing undefs'));
    });

    it('should fail on undefs in left and right stream', () => {
      action.entries[0].output.metadata = () => Promise.resolve({
        cardinality: { type: 'estimate', value: 5 },
        canContainUndefs: true,
        variables: [],
      });
      action.entries[1].output.metadata = () => Promise.resolve({
        cardinality: { type: 'estimate', value: 5 },
        canContainUndefs: true,
        variables: [],
      });
      return expect(instance.test(action)).rejects
        .toThrow(new Error('Actor name can not join streams containing undefs'));
    });
  });

  describe('test with undefs', () => {
    const instance = new Dummy(mediatorJoinSelectivity, undefined, undefined, true);

    it('should handle undefs in left stream', () => {
      action.entries[0].output.metadata = () => Promise.resolve({
        cardinality: { type: 'estimate', value: 5 },
        canContainUndefs: true,
        variables: [],
      });
      return expect(instance.test(action)).resolves
        .toEqual({
          iterations: 5,
          persistedItems: 2,
          blockingItems: 3,
          requestTime: 10,
        });
    });

    it('should handle undefs in right stream', () => {
      action.entries[1].output.metadata = () => Promise.resolve({
        cardinality: { type: 'estimate', value: 5 },
        canContainUndefs: true,
        variables: [],
      });
      return expect(instance.test(action)).resolves
        .toEqual({
          iterations: 5,
          persistedItems: 2,
          blockingItems: 3,
          requestTime: 10,
        });
    });

    it('should handle undefs in left and right stream', () => {
      action.entries[0].output.metadata = () => Promise.resolve({
        cardinality: { type: 'estimate', value: 5 },
        canContainUndefs: true,
        variables: [],
      });
      action.entries[1].output.metadata = () => Promise.resolve({
        cardinality: { type: 'estimate', value: 5 },
        canContainUndefs: true,
        variables: [],
      });
      return expect(instance.test(action)).resolves
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
      expect(await runOutput.metadata()).toEqual(await innerOutput.metadata());
    });

    it('calculates cardinality if metadata is supplied', async() => {
      action.entries[0].output.metadata = () => Promise.resolve({
        cardinality: { type: 'estimate', value: 5 },
        canContainUndefs: true,
        variables: [],
      });
      action.entries[1].output.metadata = () => Promise.resolve({
        cardinality: { type: 'estimate', value: 10 },
        canContainUndefs: true,
        variables: [],
      });
      await instance.run(action).then(async(result: any) => {
        return expect(await result.metadata()).toEqual({
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
      };
      action.context = new ActionContext({
        [KeysInitQuery.physicalQueryPlanLogger.name]: logger,
        [KeysInitQuery.physicalQueryPlanNode.name]: parentNode,
      });
      jest.spyOn(instance, 'getOutput');

      await instance.run(action);

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
