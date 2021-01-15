import { Bindings } from '@comunica/bus-query-operation';
import { Bus } from '@comunica/core';
import { DataFactory } from 'rdf-data-factory';
import type { IActionRdfJoin } from '..';
import { ActorRdfJoin } from '..';

const DF = new DataFactory();
const arrayifyStream = require('arrayify-stream');

// Dummy class to test instance of abstract class
class Dummy extends ActorRdfJoin {
  public maxEntries: number;
  public metadata: any;

  // Just here to have a valid dummy class
  public constructor(metadata?: any) {
    super({ name: 'name', bus: new Bus({ name: 'bus' }) });
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

// Dummy class to test instance of abstract class, which can handle undefs
class DummyUndefs extends ActorRdfJoin {
  public maxEntries: number;
  public metadata: any;

  // Just here to have a valid dummy class
  public constructor(metadata?: any) {
    super({ name: 'name', bus: new Bus({ name: 'bus' }) }, undefined, undefined, true);
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
      { bindingsStream: <any> null, variables: [], type: 'bindings', canContainUndefs: false },
      { bindingsStream: <any> null, variables: [], type: 'bindings', canContainUndefs: false },
    ]};
  });

  describe('The test function', () => {
    const instance = new Dummy();

    it('should return 0 iterations if there are 0 entries', () => {
      action.entries = [];
      return expect(instance.test(action)).resolves.toHaveProperty('iterations', 0);
    });

    it('should return 0 iterations if there is 1 entry', () => {
      action.entries = [ action.entries[0] ];
      return expect(instance.test(action)).resolves.toHaveProperty('iterations', 0);
    });

    it('should reject if there are too many entries', () => {
      action.entries.push(<any> {});
      instance.maxEntries = 2;
      return expect(instance.test(action)).rejects.toBeTruthy();
    });

    it('should throw an error if an entry has an incorrect type', () => {
      action.entries.push(<any> { type: 'invalid' });
      action.entries.push(<any> { type: 'invalid' });
      instance.maxEntries = 99;
      return expect(instance.test(action)).rejects.toBeTruthy();
    });

    it('should return infinity if both metadata objects are missing', () => {
      return expect(instance.test(action)).resolves.toHaveProperty('iterations', Number.POSITIVE_INFINITY);
    });

    it('should return infinity if the left metadata object is missing', async() => {
      action.entries[1].metadata = () => Promise.resolve({ totalItems: 5 });
      await expect(instance.test(action)).resolves.toHaveProperty('iterations', Number.POSITIVE_INFINITY);
    });

    it('should return infinity if the right metadata object is missing', () => {
      action.entries[0].metadata = () => Promise.resolve({ totalItems: 5 });
      return expect(instance.test(action)).resolves.toHaveProperty('iterations', Number.POSITIVE_INFINITY);
    });

    it('should return a value if both metadata objects are present', () => {
      action.entries[0].metadata = () => Promise.resolve({ totalItems: 5 });
      action.entries[1].metadata = () => Promise.resolve({ totalItems: 5 });
      return expect(instance.test(action)).resolves.toHaveProperty('iterations', 5);
    });

    it('should fail on undefs in left stream', () => {
      action.entries[0].canContainUndefs = true;
      return expect(instance.test(action)).rejects
        .toThrow(new Error('Actor name can not join streams containing undefs'));
    });

    it('should fail on undefs in right stream', () => {
      action.entries[1].canContainUndefs = true;
      return expect(instance.test(action)).rejects
        .toThrow(new Error('Actor name can not join streams containing undefs'));
    });

    it('should fail on undefs in left and right stream', () => {
      action.entries[0].canContainUndefs = true;
      action.entries[1].canContainUndefs = true;
      return expect(instance.test(action)).rejects
        .toThrow(new Error('Actor name can not join streams containing undefs'));
    });
  });

  describe('The test function for an actor that can handle undefs', () => {
    const instance = new DummyUndefs();

    it('should handle undefs in left stream', () => {
      action.entries[0].canContainUndefs = true;
      return expect(instance.test(action)).resolves
        .toEqual({ iterations: Number.POSITIVE_INFINITY });
    });

    it('should handle undefs in right stream', () => {
      action.entries[1].canContainUndefs = true;
      return expect(instance.test(action)).resolves
        .toEqual({ iterations: Number.POSITIVE_INFINITY });
    });

    it('should handle undefs in left and right stream', () => {
      action.entries[0].canContainUndefs = true;
      action.entries[1].canContainUndefs = true;
      return expect(instance.test(action)).resolves
        .toEqual({ iterations: Number.POSITIVE_INFINITY });
    });
  });

  describe('The overlappingVariables function', () => {
    it('should return an empty array if there is no overlap', () => {
      expect(ActorRdfJoin.overlappingVariables(action)).toEqual([]);
      action.entries[0].variables = [ 'a', 'b' ];
      action.entries[1].variables = [ 'c', 'd' ];
      expect(ActorRdfJoin.overlappingVariables(action)).toEqual([]);
    });

    it('should return a correct array if there is overlap', () => {
      action.entries[0].variables = [ 'a', 'b' ];
      action.entries[1].variables = [ 'a', 'd' ];
      expect(ActorRdfJoin.overlappingVariables(action)).toEqual([ 'a' ]);

      action.entries[0].variables = [ 'a', 'b' ];
      action.entries[1].variables = [ 'a', 'b' ];
      expect(ActorRdfJoin.overlappingVariables(action)).toEqual([ 'a', 'b' ]);

      action.entries[0].variables = [ 'c', 'b' ];
      action.entries[1].variables = [ 'a', 'b' ];
      expect(ActorRdfJoin.overlappingVariables(action)).toEqual([ 'b' ]);
    });
  });

  describe('The joinVariables function', () => {
    it('should join variables', () => {
      expect(ActorRdfJoin.joinVariables(action)).toEqual([]);

      action.entries[0].variables = [ 'a', 'b' ];
      action.entries[1].variables = [ 'c', 'd' ];
      expect(ActorRdfJoin.joinVariables(action)).toEqual([ 'a', 'b', 'c', 'd' ]);
    });

    it('should deduplicate the result', () => {
      action.entries[0].variables = [ 'a', 'b' ];
      action.entries[1].variables = [ 'b', 'd' ];
      expect(ActorRdfJoin.joinVariables(action)).toEqual([ 'a', 'b', 'd' ]);

      action.entries[0].variables = [ 'a', 'b' ];
      action.entries[1].variables = [ 'b', 'a' ];
      expect(ActorRdfJoin.joinVariables(action)).toEqual([ 'a', 'b' ]);
    });
  });

  describe('The join function', () => {
    it('should return the right binding if the left is empty', () => {
      const left = Bindings({});
      const right = Bindings({ x: DF.literal('a'), y: DF.literal('b') });
      return expect(ActorRdfJoin.join(left, right)).toEqual(right);
    });

    it('should return the left binding if the right is empty', () => {
      const left = Bindings({ x: DF.literal('a'), y: DF.literal('b') });
      const right = Bindings({});
      return expect(ActorRdfJoin.join(left, right)).toEqual(left);
    });

    it('should join 2 bindings with no overlapping variables', () => {
      const left = Bindings({ x: DF.literal('a'), y: DF.literal('b') });
      const right = Bindings({ v: DF.literal('d'), w: DF.literal('e') });
      const result = Bindings({ x: DF.literal('a'), y: DF.literal('b'), v: DF.literal('d'), w: DF.literal('e') });
      return expect(ActorRdfJoin.join(left, right)).toEqual(result);
    });

    it('should join 2 bindings with overlapping variables', () => {
      const left = Bindings({ x: DF.literal('a'), y: DF.literal('b') });
      const right = Bindings({ x: DF.literal('a'), w: DF.literal('e') });
      const result = Bindings({ x: DF.literal('a'), y: DF.literal('b'), w: DF.literal('e') });
      return expect(ActorRdfJoin.join(left, right)).toEqual(result);
    });

    it('should not join bindings with conflicting mappings', () => {
      const left = Bindings({ x: DF.literal('a'), y: DF.literal('b') });
      const right = Bindings({ x: DF.literal('b'), w: DF.literal('e') });
      return expect(ActorRdfJoin.join(left, right)).toBeFalsy();
    });
  });

  describe('The iteratorsHaveMetadata function', () => {
    it('should return false if there is no left metadata', () => {
      action.entries[1].metadata = () => Promise.resolve({});
      return expect(ActorRdfJoin.iteratorsHaveMetadata(action, 'key')).resolves.toBeFalsy();
    });

    it('should return false if there is no right metadata', () => {
      action.entries[0].metadata = () => Promise.resolve({});
      return expect(ActorRdfJoin.iteratorsHaveMetadata(action, 'key')).resolves.toBeFalsy();
    });

    it('should return false if no relevant left metadata', () => {
      action.entries[0].metadata = () => Promise.resolve({});
      action.entries[1].metadata = () => Promise.resolve({ key: 5 });
      return expect(ActorRdfJoin.iteratorsHaveMetadata(action, 'key')).resolves.toBeFalsy();
    });

    it('should return false if no relevant right metadata', () => {
      action.entries[0].metadata = () => Promise.resolve({ key: 5 });
      action.entries[1].metadata = () => Promise.resolve({});
      return expect(ActorRdfJoin.iteratorsHaveMetadata(action, 'key')).resolves.toBeFalsy();
    });

    it('should return true if both have the relevant metadata', () => {
      action.entries[0].metadata = () => Promise.resolve({ key: 5 });
      action.entries[1].metadata = () => Promise.resolve({ key: 10 });
      return expect(ActorRdfJoin.iteratorsHaveMetadata(action, 'key')).resolves.toBeTruthy();
    });
  });

  describe('The run function', () => {
    const instance = new Dummy();

    it('returns an empty stream for empty input', () => {
      action.entries = [];

      return instance.run(action).then(async(result: any) => {
        expect(await arrayifyStream(result.bindingsStream)).toEqual([]);
        expect(result.variables).toEqual([]);
        expect(result.canContainUndefs).toEqual(false);
        return expect(await result.metadata()).toEqual({ totalItems: 0 });
      });
    });

    it('returns the input if there is only one', () => {
      action.entries = [ action.entries[0] ];
      return expect(instance.run(action)).resolves.toEqual(action.entries[0]);
    });

    it('calls getOutput if there are 2+ entries', async() => {
      await expect(instance.run(action)).resolves.toEqual(await instance.getOutput(action));
    });

    it('calculates totalItems if metadata is supplied', async() => {
      action.entries[0].metadata = () => Promise.resolve({ totalItems: 5 });
      action.entries[1].metadata = () => Promise.resolve({ totalItems: 10 });
      await instance.run(action).then(async(result: any) => {
        expect(result.canContainUndefs).toEqual(true);
        return expect(await result.metadata()).toEqual({ totalItems: 50 });
      });
    });

    it('keeps generated metadata', async() => {
      const metaInstance = new Dummy({ keep: true });
      action.entries[0].metadata = () => Promise.resolve({ totalItems: 5 });
      action.entries[1].metadata = () => Promise.resolve({ totalItems: 10 });
      await metaInstance.run(action).then(async(result: any) => {
        expect(result.canContainUndefs).toEqual(true);
        return expect(await result.metadata()).toEqual({ keep: true, totalItems: 50 });
      });
    });

    it('does not overwrite calculated totalItems', async() => {
      const metaInstance = new Dummy({ totalItems: 10 });
      action.entries[0].metadata = () => Promise.resolve({ totalItems: 5 });
      action.entries[1].metadata = () => Promise.resolve({ totalItems: 10 });
      await metaInstance.run(action).then(async(result: any) => {
        expect(result.canContainUndefs).toEqual(true);
        return expect(await result.metadata()).toEqual({ totalItems: 10 });
      });
    });
  });
});
