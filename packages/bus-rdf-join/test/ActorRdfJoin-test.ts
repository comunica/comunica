
import {Bindings} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {EmptyIterator} from "asynciterator";
import {literal} from "rdf-data-model";
import {ActorRdfJoin, IActionRdfJoin} from "../lib/ActorRdfJoin";

// dummy class to test instance of abstract class
class Dummy extends ActorRdfJoin {

  public maxEntries: number;

  // just here to have a valid dummy class
  constructor() {
    super({name: 'name', bus: new Bus({ name: 'bus' })});
  }

  public async getOutput(action: IActionRdfJoin) {
    return (<any> "output");
  }

  protected getIterations(action: IActionRdfJoin): number {
    return 5;
  }
}

describe('ActorRdfJoin', () => {

  let action: IActionRdfJoin;

  beforeEach(() => {
    action = { entries: [
      { bindingsStream: null, metadata: {}, variables: [] },
      { bindingsStream: null, metadata: {}, variables: [] },
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

    it('should return null if there are too many entries', () => {
      action.entries.push(<any> {});
      instance.maxEntries = 2;
      return expect(instance.test(action)).resolves.toBeFalsy();
    });

    it('should return infinity if both metadata objects are missing', () => {
      return expect(instance.test(action)).resolves.toHaveProperty('iterations', Infinity);
    });

    it('should return infinity if the left metadata object is missing', async () => {
      action.entries[1].metadata = { totalItems: 5 };
      return expect(instance.test(action)).resolves.toHaveProperty('iterations', Infinity);
    });

    it('should return infinity if the right metadata object is missing', () => {
      action.entries[0].metadata = { totalItems: 5 };
      return expect(instance.test(action)).resolves.toHaveProperty('iterations', Infinity);
    });

    it('should return a value if both metadata objects are present', () => {
      action.entries[0].metadata = { totalItems: 5 };
      action.entries[1].metadata = { totalItems: 5 };
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
      action.entries[0].metadata = null;
      return expect(ActorRdfJoin.iteratorsHaveMetadata(action, 'key')).toBeFalsy();
    });

    it('should return false if there is no right metadata', () => {
      action.entries[1].metadata = null;
      return expect(ActorRdfJoin.iteratorsHaveMetadata(action, 'key')).toBeFalsy();
    });

    it('should return false if no relevant left metadata', () => {
      action.entries[1].metadata.key = 5;
      return expect(ActorRdfJoin.iteratorsHaveMetadata(action, 'key')).toBeFalsy();
    });

    it('should return false if no relevant right metadata', () => {
      action.entries[0].metadata.key = 5;
      return expect(ActorRdfJoin.iteratorsHaveMetadata(action, 'key')).toBeFalsy();
    });

    it('should return true if both have the relevant metadata', () => {
      action.entries[0].metadata.key = 5;
      action.entries[1].metadata.key = 10;
      return expect(ActorRdfJoin.iteratorsHaveMetadata(action, 'key')).toBeTruthy();
    });
  });

  describe('The run function', () => {
    const instance = new Dummy();

    it('returns an empty stream for empty input', () => {
      action.entries = [];
      return expect(instance.run(action)).resolves.toMatchObject({
        bindingsStream: new EmptyIterator(),
        metadata: { totalItems: 0 },
        variables: [],
      });
    });

    it('returns the input if there is only one', () => {
      action.entries = [action.entries[0]];
      return expect(instance.run(action)).resolves.toEqual(action.entries[0]);
    });

    it('calls getOutput if there are 2+ entries ', async () => {
      return expect(instance.run(action)).resolves.toEqual(await instance.getOutput(action));
    });
  });
});
