import {Bindings} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {literal} from "@rdfjs/data-model";
import {EmptyIterator} from "asynciterator";
import {ActorRdfJoin, IActionRdfJoin} from "../lib/ActorRdfJoin";

// dummy class to test instance of abstract class
class Dummy extends ActorRdfJoin {

  public maxEntries: number;
  public metadata: any;

  // just here to have a valid dummy class
  constructor(metadata?: any) {
    super({name: 'name', bus: new Bus({ name: 'bus' })});
    this.metadata = metadata;
  }

  public async getOutput(action: IActionRdfJoin) {
    const result = (<any> { dummy: 'dummy' });

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
      { bindingsStream: null, variables: [], type: 'bindings' },
      { bindingsStream: null, variables: [], type: 'bindings' },
    ]};
  });

  describe('The test function', () => {
    const instance = new Dummy();

    it('should return 0 iterations if there are 0 entries', () => {
      action.entries = [];
      return expect(instance.test(action)).resolves.toHaveProperty('iterations', 0);
    });

    it('should return 0 iterations if there is 1 entry', () => {
      action.entries = [action.entries[0]];
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
      return expect(instance.test(action)).resolves.toHaveProperty('iterations', Infinity);
    });

    it('should return infinity if the left metadata object is missing', async () => {
      action.entries[1].metadata = () => Promise.resolve({ totalItems: 5 });
      return expect(instance.test(action)).resolves.toHaveProperty('iterations', Infinity);
    });

    it('should return infinity if the right metadata object is missing', () => {
      action.entries[0].metadata = () => Promise.resolve({ totalItems: 5 });
      return expect(instance.test(action)).resolves.toHaveProperty('iterations', Infinity);
    });

    it('should return a value if both metadata objects are present', () => {
      action.entries[0].metadata = () => Promise.resolve({ totalItems: 5 });
      action.entries[1].metadata = () => Promise.resolve({ totalItems: 5 });
      return expect(instance.test(action)).resolves.toHaveProperty('iterations', 5);
    });
  });

  describe('The overlappingVariables function', () => {

    it('should return an empty array if there is no overlap', () => {
      expect(ActorRdfJoin.overlappingVariables(action)).toEqual([]);
      action.entries[0].variables = ['a', 'b'];
      action.entries[1].variables = ['c', 'd'];
      expect(ActorRdfJoin.overlappingVariables(action)).toEqual([]);
    });

    it('should return a correct array if there is overlap', () => {
      action.entries[0].variables = ['a', 'b'];
      action.entries[1].variables = ['a', 'd'];
      expect(ActorRdfJoin.overlappingVariables(action)).toEqual(['a']);

      action.entries[0].variables = ['a', 'b'];
      action.entries[1].variables = ['a', 'b'];
      expect(ActorRdfJoin.overlappingVariables(action)).toEqual(['a', 'b']);

      action.entries[0].variables = ['c', 'b'];
      action.entries[1].variables = ['a', 'b'];
      expect(ActorRdfJoin.overlappingVariables(action)).toEqual(['b']);
    });
  });

  describe('The joinVariables function', () => {

    it('should join variables', () => {
      expect(ActorRdfJoin.joinVariables(action)).toEqual([]);

      action.entries[0].variables = ['a', 'b'];
      action.entries[1].variables = ['c', 'd'];
      expect(ActorRdfJoin.joinVariables(action)).toEqual(['a', 'b', 'c', 'd']);
    });

    it('should deduplicate the result', () => {
      action.entries[0].variables = ['a', 'b'];
      action.entries[1].variables = ['b', 'd'];
      expect(ActorRdfJoin.joinVariables(action)).toEqual(['a', 'b', 'd']);

      action.entries[0].variables = ['a', 'b'];
      action.entries[1].variables = ['b', 'a'];
      expect(ActorRdfJoin.joinVariables(action)).toEqual(['a', 'b']);
    });
  });

  describe('The join function', () => {

    it('should return the right binding if the left is empty', () => {
      const left = Bindings({});
      const right = Bindings({ x: literal('a'), y: literal('b') });
      return expect(ActorRdfJoin.join(left, right)).toEqual(right);
    });

    it('should return the left binding if the right is empty', () => {
      const left = Bindings({ x: literal('a'), y: literal('b') });
      const right = Bindings({});
      return expect(ActorRdfJoin.join(left, right)).toEqual(left);
    });

    it('should join 2 bindings with no overlapping variables', () => {
      const left = Bindings({ x: literal('a'), y: literal('b') });
      const right = Bindings({ v: literal('d'), w: literal('e' )});
      const result = Bindings({ x: literal('a'), y: literal('b'), v: literal('d'), w: literal('e') });
      return expect(ActorRdfJoin.join(left, right)).toEqual(result);
    });

    it('should join 2 bindings with overlapping variables', () => {
      const left = Bindings({ x: literal('a'), y: literal('b') });
      const right = Bindings({ x: literal('a'), w: literal('e' )});
      const result = Bindings({ x: literal('a'), y: literal('b'), w: literal('e') });
      return expect(ActorRdfJoin.join(left, right)).toEqual(result);
    });

    it('should not join bindings with conflicting mappings', () => {
      const left = Bindings({ x: literal('a'), y: literal('b') });
      const right = Bindings({ x: literal('b'), w: literal('e' )});
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

      return instance.run(action).then((result) => {
        expect(result.bindingsStream).toEqual(new EmptyIterator());
        expect(result.variables).toEqual([]);
        return expect(result.metadata()).resolves.toEqual({ totalItems: 0 });
      });
    });

    it('returns the input if there is only one', () => {
      action.entries = [action.entries[0]];
      return expect(instance.run(action)).resolves.toEqual(action.entries[0]);
    });

    it('calls getOutput if there are 2+ entries', async () => {
      return expect(instance.run(action)).resolves.toEqual(await instance.getOutput(action));
    });

    it('calculates totalItems if metadata is supplied', async () => {
      action.entries[0].metadata = () => Promise.resolve({ totalItems: 5 });
      action.entries[1].metadata = () => Promise.resolve({ totalItems: 10 });
      return instance.run(action).then((result) => {
        return expect(result.metadata()).resolves.toEqual({ totalItems: 50 });
      });
    });

    it('keeps generated metadata', async () => {
      const metaInstance = new Dummy({ keep: true });
      action.entries[0].metadata = () => Promise.resolve({ totalItems: 5 });
      action.entries[1].metadata = () => Promise.resolve({ totalItems: 10 });
      return metaInstance.run(action).then((result) => {
        return expect(result.metadata()).resolves.toEqual({ keep: true, totalItems: 50 });
      });
    });

    it('does not overwrite calculated totalItems', async () => {
      const metaInstance = new Dummy({ totalItems: 10 });
      action.entries[0].metadata = () => Promise.resolve({ totalItems: 5 });
      action.entries[1].metadata = () => Promise.resolve({ totalItems: 10 });
      return metaInstance.run(action).then((result) => {
        return expect(result.metadata()).resolves.toEqual({ totalItems: 10 });
      });
    });
  });
});
