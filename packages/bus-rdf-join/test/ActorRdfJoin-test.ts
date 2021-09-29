import { Bindings } from '@comunica/bus-query-operation';
import { Bus } from '@comunica/core';
import { DataFactory } from 'rdf-data-factory';
import type { IActionRdfJoin } from '../lib/ActorRdfJoin';
import { ActorRdfJoin } from '../lib/ActorRdfJoin';

const DF = new DataFactory();
const arrayifyStream = require('arrayify-stream');

// Dummy class to test instance of abstract class
class Dummy extends ActorRdfJoin {
  public metadata: any;

  // Just here to have a valid dummy class
  public constructor(
    metadata?: any,
    limitEntries?: number,
    limitEntriesMin?: boolean,
    canHandleUndefs?: boolean,
  ) {
    super({ name: 'name', bus: new Bus({ name: 'bus' }) }, limitEntries, limitEntriesMin, canHandleUndefs);
    this.metadata = metadata;
  }

  public async getOutput(action: IActionRdfJoin) {
    const result = <any> { dummy: 'dummy', canContainUndefs: true };

    if (this.metadata) {
      result.metadata = () => Promise.resolve(this.metadata);
    }

    return result;
  }

  protected getIterations(action: IActionRdfJoin): Promise<number> {
    return Promise.resolve(5);
  }
}

describe('ActorRdfJoin', () => {
  let action: IActionRdfJoin;

  beforeEach(() => {
    action = { entries: [
      {
        output: {
          bindingsStream: <any>null,
          variables: [],
          type: 'bindings',
          canContainUndefs: false,
          metadata: async() => ({ totalItems: 10 }),
        },
        operation: <any>{},
      },
      {
        output: {
          bindingsStream: <any>null,
          variables: [],
          type: 'bindings',
          canContainUndefs: false,
          metadata: async() => ({ totalItems: 5 }),
        },
        operation: <any>{},
      },
    ]};
  });

  describe('overlappingVariables', () => {
    it('should return an empty array if there is no overlap', () => {
      expect(ActorRdfJoin.overlappingVariables(action)).toEqual([]);
      action.entries[0].output.variables = [ 'a', 'b' ];
      action.entries[1].output.variables = [ 'c', 'd' ];
      expect(ActorRdfJoin.overlappingVariables(action)).toEqual([]);
    });

    it('should return a correct array if there is overlap', () => {
      action.entries[0].output.variables = [ 'a', 'b' ];
      action.entries[1].output.variables = [ 'a', 'd' ];
      expect(ActorRdfJoin.overlappingVariables(action)).toEqual([ 'a' ]);

      action.entries[0].output.variables = [ 'a', 'b' ];
      action.entries[1].output.variables = [ 'a', 'b' ];
      expect(ActorRdfJoin.overlappingVariables(action)).toEqual([ 'a', 'b' ]);

      action.entries[0].output.variables = [ 'c', 'b' ];
      action.entries[1].output.variables = [ 'a', 'b' ];
      expect(ActorRdfJoin.overlappingVariables(action)).toEqual([ 'b' ]);
    });
  });

  describe('joinVariables', () => {
    it('should join variables', () => {
      expect(ActorRdfJoin.joinVariables(action)).toEqual([]);

      action.entries[0].output.variables = [ 'a', 'b' ];
      action.entries[1].output.variables = [ 'c', 'd' ];
      expect(ActorRdfJoin.joinVariables(action)).toEqual([ 'a', 'b', 'c', 'd' ]);
    });

    it('should deduplicate the result', () => {
      action.entries[0].output.variables = [ 'a', 'b' ];
      action.entries[1].output.variables = [ 'b', 'd' ];
      expect(ActorRdfJoin.joinVariables(action)).toEqual([ 'a', 'b', 'd' ]);

      action.entries[0].output.variables = [ 'a', 'b' ];
      action.entries[1].output.variables = [ 'b', 'a' ];
      expect(ActorRdfJoin.joinVariables(action)).toEqual([ 'a', 'b' ]);
    });
  });

  describe('joinBindings', () => {
    it('should return the right binding if the left is empty', () => {
      const left = Bindings({});
      const right = Bindings({ x: DF.literal('a'), y: DF.literal('b') });
      return expect(ActorRdfJoin.joinBindings(left, right)).toEqual(right);
    });

    it('should return the left binding if the right is empty', () => {
      const left = Bindings({ x: DF.literal('a'), y: DF.literal('b') });
      const right = Bindings({});
      return expect(ActorRdfJoin.joinBindings(left, right)).toEqual(left);
    });

    it('should join 2 bindings with no overlapping variables', () => {
      const left = Bindings({ x: DF.literal('a'), y: DF.literal('b') });
      const right = Bindings({ v: DF.literal('d'), w: DF.literal('e') });
      const result = Bindings({ x: DF.literal('a'), y: DF.literal('b'), v: DF.literal('d'), w: DF.literal('e') });
      return expect(ActorRdfJoin.joinBindings(left, right)).toEqual(result);
    });

    it('should join 2 bindings with overlapping variables', () => {
      const left = Bindings({ x: DF.literal('a'), y: DF.literal('b') });
      const right = Bindings({ x: DF.literal('a'), w: DF.literal('e') });
      const result = Bindings({ x: DF.literal('a'), y: DF.literal('b'), w: DF.literal('e') });
      return expect(ActorRdfJoin.joinBindings(left, right)).toEqual(result);
    });

    it('should not join bindings with conflicting mappings', () => {
      const left = Bindings({ x: DF.literal('a'), y: DF.literal('b') });
      const right = Bindings({ x: DF.literal('b'), w: DF.literal('e') });
      return expect(ActorRdfJoin.joinBindings(left, right)).toBeFalsy();
    });
  });

  describe('allEntriesHaveMetadata', () => {
    it('should return false if there is no left metadata', () => {
      action.entries[1].output.metadata = () => Promise.resolve({});
      return expect(ActorRdfJoin.allEntriesHaveMetadata(action, 'key')).resolves.toBeFalsy();
    });

    it('should return false if there is no right metadata', () => {
      action.entries[0].output.metadata = () => Promise.resolve({});
      return expect(ActorRdfJoin.allEntriesHaveMetadata(action, 'key')).resolves.toBeFalsy();
    });

    it('should return false if no relevant left metadata', () => {
      action.entries[0].output.metadata = () => Promise.resolve({});
      action.entries[1].output.metadata = () => Promise.resolve({ key: 5 });
      return expect(ActorRdfJoin.allEntriesHaveMetadata(action, 'key')).resolves.toBeFalsy();
    });

    it('should return false if no relevant right metadata', () => {
      action.entries[0].output.metadata = () => Promise.resolve({ key: 5 });
      action.entries[1].output.metadata = () => Promise.resolve({});
      return expect(ActorRdfJoin.allEntriesHaveMetadata(action, 'key')).resolves.toBeFalsy();
    });

    it('should return true if both have the relevant metadata', () => {
      action.entries[0].output.metadata = () => Promise.resolve({ key: 5 });
      action.entries[1].output.metadata = () => Promise.resolve({ key: 10 });
      return expect(ActorRdfJoin.allEntriesHaveMetadata(action, 'key')).resolves.toBeTruthy();
    });
  });

  describe('getCardinality', () => {
    it('should be infinity for empty metadata', () => {
      return expect(ActorRdfJoin.getCardinality({})).toEqual(Number.POSITIVE_INFINITY);
    });

    it('should handle 0 metadata', () => {
      return expect(ActorRdfJoin.getCardinality({ totalItems: 0 })).toEqual(0);
    });

    it('should handle 5 metadata', () => {
      return expect(ActorRdfJoin.getCardinality({ totalItems: 5 })).toEqual(5);
    });
  });

  describe('getLowestCardinalityIndex', () => {
    it('should return -1 for no metadatas', () => {
      return expect(ActorRdfJoin.getLowestCardinalityIndex([])).toEqual(-1);
    });

    it('should return 0 for 1 empty metadata', () => {
      return expect(ActorRdfJoin.getLowestCardinalityIndex([
        {},
      ])).toEqual(0);
    });

    it('should return 0 for 3 empty metadatas', () => {
      return expect(ActorRdfJoin.getLowestCardinalityIndex([
        {},
        {},
        {},
      ])).toEqual(0);
    });

    it('should return 0 for 1 metadata', () => {
      return expect(ActorRdfJoin.getLowestCardinalityIndex([
        { totalItems: 10 },
      ])).toEqual(0);
    });

    it('should return 1 for 3 metadatas', () => {
      return expect(ActorRdfJoin.getLowestCardinalityIndex([
        { totalItems: 20 },
        { totalItems: 10 },
        { totalItems: 30 },
      ])).toEqual(1);
    });

    it('should return 0 for 3 infinite metadatas', () => {
      return expect(ActorRdfJoin.getLowestCardinalityIndex([
        { totalItems: Number.POSITIVE_INFINITY },
        { totalItems: Number.POSITIVE_INFINITY },
        { totalItems: Number.POSITIVE_INFINITY },
      ])).toEqual(0);
    });

    it('should return 1 for 2 infinite metadatas', () => {
      return expect(ActorRdfJoin.getLowestCardinalityIndex([
        { totalItems: Number.POSITIVE_INFINITY },
        { totalItems: 1_000 },
        { totalItems: Number.POSITIVE_INFINITY },
      ])).toEqual(1);
    });
  });

  describe('getMetadatas', () => {
    it('should handle no entries', async() => {
      expect(await ActorRdfJoin.getMetadatas([])).toEqual([]);
    });

    it('should handle entries', async() => {
      expect(await ActorRdfJoin.getMetadatas(action.entries)).toEqual([
        { totalItems: 10 },
        { totalItems: 5 },
      ]);
    });
  });

  describe('test', () => {
    let instance: Dummy;

    beforeEach(() => {
      instance = new Dummy();
    });

    it('should return 0 iterations if there are 0 entries', () => {
      action.entries = [];
      return expect(instance.test(action)).resolves.toHaveProperty('iterations', 0);
    });

    it('should return 0 iterations if there is 1 entry', () => {
      action.entries = [ action.entries[0] ];
      return expect(instance.test(action)).resolves.toHaveProperty('iterations', 0);
    });

    it('should reject if there are too many entries', () => {
      action.entries.push(<any> { bindings: { type: 'bindings' }});
      instance = new Dummy(undefined, 2);
      return expect(instance.test(action)).rejects.toThrowError(`name requires 2 sources at most. The input contained 3.`);
    });

    it('should reject if there are too few entries', () => {
      instance = new Dummy(undefined, 3, true);
      return expect(instance.test(action)).rejects.toThrowError(`name requires 3 sources at least. The input contained 2.`);
    });

    it('should throw an error if an entry has an incorrect type', () => {
      action.entries.push(<any> { output: { type: 'invalid' }});
      action.entries.push(<any> { output: { type: 'invalid' }});
      instance = new Dummy(undefined, 99);
      return expect(instance.test(action)).rejects
        .toThrowError(`Invalid type of a join entry: Expected 'bindings' but got 'invalid'`);
    });

    it('should return infinity if both metadata objects are missing', () => {
      delete action.entries[0].output.metadata;
      delete action.entries[1].output.metadata;
      return expect(instance.test(action)).resolves.toHaveProperty('iterations', Number.POSITIVE_INFINITY);
    });

    it('should return infinity if the left metadata object is missing', async() => {
      delete action.entries[0].output.metadata;
      action.entries[1].output.metadata = () => Promise.resolve({ totalItems: 5 });
      await expect(instance.test(action)).resolves.toHaveProperty('iterations', Number.POSITIVE_INFINITY);
    });

    it('should return infinity if the right metadata object is missing', () => {
      action.entries[0].output.metadata = () => Promise.resolve({ totalItems: 5 });
      delete action.entries[1].output.metadata;
      return expect(instance.test(action)).resolves.toHaveProperty('iterations', Number.POSITIVE_INFINITY);
    });

    it('should return a value if both metadata objects are present', () => {
      action.entries[0].output.metadata = () => Promise.resolve({ totalItems: 5 });
      action.entries[1].output.metadata = () => Promise.resolve({ totalItems: 5 });
      return expect(instance.test(action)).resolves.toHaveProperty('iterations', 5);
    });

    it('should fail on undefs in left stream', () => {
      action.entries[0].output.canContainUndefs = true;
      return expect(instance.test(action)).rejects
        .toThrow(new Error('Actor name can not join streams containing undefs'));
    });

    it('should fail on undefs in right stream', () => {
      action.entries[1].output.canContainUndefs = true;
      return expect(instance.test(action)).rejects
        .toThrow(new Error('Actor name can not join streams containing undefs'));
    });

    it('should fail on undefs in left and right stream', () => {
      action.entries[0].output.canContainUndefs = true;
      action.entries[1].output.canContainUndefs = true;
      return expect(instance.test(action)).rejects
        .toThrow(new Error('Actor name can not join streams containing undefs'));
    });
  });

  describe('test with undefs', () => {
    const instance = new Dummy(undefined, undefined, undefined, true);

    it('should handle undefs in left stream', () => {
      action.entries[0].output.canContainUndefs = true;
      return expect(instance.test(action)).resolves
        .toEqual({ iterations: 5 });
    });

    it('should handle undefs in right stream', () => {
      action.entries[1].output.canContainUndefs = true;
      return expect(instance.test(action)).resolves
        .toEqual({ iterations: 5 });
    });

    it('should handle undefs in left and right stream', () => {
      action.entries[0].output.canContainUndefs = true;
      action.entries[1].output.canContainUndefs = true;
      return expect(instance.test(action)).resolves
        .toEqual({ iterations: 5 });
    });
  });

  describe('run', () => {
    const instance = new Dummy();

    it('returns a singleton stream for empty input', () => {
      action.entries = [];

      return instance.run(action).then(async(result: any) => {
        expect(await arrayifyStream(result.bindingsStream)).toEqual([ Bindings({}) ]);
        expect(result.variables).toEqual([]);
        expect(result.canContainUndefs).toEqual(false);
        return expect(await result.metadata()).toEqual({ totalItems: 1 });
      });
    });

    it('returns the input if there is only one', () => {
      action.entries = [ action.entries[0] ];
      return expect(instance.run(action)).resolves.toEqual(action.entries[0].output);
    });

    it('calls getOutput if there are 2+ entries', async() => {
      delete action.entries[0].output.metadata;
      delete action.entries[1].output.metadata;
      await expect(instance.run(action)).resolves.toEqual(await instance.getOutput(action));
    });

    it('calculates totalItems if metadata is supplied', async() => {
      action.entries[0].output.metadata = () => Promise.resolve({ totalItems: 5 });
      action.entries[1].output.metadata = () => Promise.resolve({ totalItems: 10 });
      await instance.run(action).then(async(result: any) => {
        expect(result.canContainUndefs).toEqual(true);
        return expect(await result.metadata()).toEqual({ totalItems: 50 });
      });
    });

    it('keeps generated metadata', async() => {
      const metaInstance = new Dummy({ keep: true });
      action.entries[0].output.metadata = () => Promise.resolve({ totalItems: 5 });
      action.entries[1].output.metadata = () => Promise.resolve({ totalItems: 10 });
      await metaInstance.run(action).then(async(result: any) => {
        expect(result.canContainUndefs).toEqual(true);
        return expect(await result.metadata()).toEqual({ keep: true, totalItems: 50 });
      });
    });

    it('does not overwrite calculated totalItems', async() => {
      const metaInstance = new Dummy({ totalItems: 10 });
      action.entries[0].output.metadata = () => Promise.resolve({ totalItems: 5 });
      action.entries[1].output.metadata = () => Promise.resolve({ totalItems: 10 });
      await metaInstance.run(action).then(async(result: any) => {
        expect(result.canContainUndefs).toEqual(true);
        return expect(await result.metadata()).toEqual({ totalItems: 10 });
      });
    });
  });
});
