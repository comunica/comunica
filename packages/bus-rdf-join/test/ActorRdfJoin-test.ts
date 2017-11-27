
import {Bindings} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {literal} from "rdf-data-model";
import {ActorRdfJoin, IActionRdfJoin} from "../lib/ActorRdfJoin";

// dummy class to test protected functions
class Dummy extends ActorRdfJoin {

  // just here to have a valid dummy class
  constructor() {
    super({name: 'name', bus: new Bus({ name: 'bus' })});
  }

  public static join(left: Bindings, right: Bindings): Bindings {
    return ActorRdfJoin.join(left, right);
  }

  public static iteratorsHaveMetadata(action: IActionRdfJoin, key: string): boolean {
    return ActorRdfJoin.iteratorsHaveMetadata(action, key);
  }

  // just here to have a valid dummy class
  public async run(action: IActionRdfJoin) { return null; }

  protected getIterations(action: IActionRdfJoin): number {
    return 5;
  }
}

describe('ActorRdfJoin', () => {

  describe('The test function', () => {
    const instance = new Dummy();
    let action: IActionRdfJoin;

    beforeEach(() => {
      action = { left: null, right: null, leftMetadata: {}, rightMetadata: {} };
    });

    it('should return infinity if both metadata objects are missing', () => {
      return expect(instance.test(action)).resolves.toHaveProperty('iterations', Infinity);
    });

    it('should return infinity if the left metadata object is missing', async () => {
      action.rightMetadata = { totalItems: 5 };
      return expect(instance.test(action)).resolves.toHaveProperty('iterations', Infinity);
    });

    it('should return infinity if the right metadata object is missing', () => {
      action.leftMetadata = { totalItems: 5 };
      return expect(instance.test(action)).resolves.toHaveProperty('iterations', Infinity);
    });

    it('should return a value if both metadata objects are present', () => {
      action.leftMetadata = { totalItems: 5 };
      action.rightMetadata = { totalItems: 5 };
      return expect(instance.test(action)).resolves.toHaveProperty('iterations', 5);
    });
  });

  describe('The join function', () => {

    it('should return the right binding if the left is empty', () => {
      const left = Bindings({});
      const right = Bindings({ x: literal('a'), y: literal('b') });
      return expect(Dummy.join(left, right)).toEqual(right);
    });

    it('should return the left binding if the right is empty', () => {
      const left = Bindings({ x: literal('a'), y: literal('b') });
      const right = Bindings({});
      return expect(Dummy.join(left, right)).toEqual(left);
    });

    it('should join 2 bindings with no overlapping variables', () => {
      const left = Bindings({ x: literal('a'), y: literal('b') });
      const right = Bindings({ v: literal('d'), w: literal('e' )});
      const result = Bindings({ x: literal('a'), y: literal('b'), v: literal('d'), w: literal('e') });
      return expect(Dummy.join(left, right)).toEqual(result);
    });

    it('should join 2 bindings with overlapping variables', () => {
      const left = Bindings({ x: literal('a'), y: literal('b') });
      const right = Bindings({ x: literal('a'), w: literal('e' )});
      const result = Bindings({ x: literal('a'), y: literal('b'), w: literal('e') });
      return expect(Dummy.join(left, right)).toEqual(result);
    });

    it('should not join bindings with conflicting mappings', () => {
      const left = Bindings({ x: literal('a'), y: literal('b') });
      const right = Bindings({ x: literal('b'), w: literal('e' )});
      return expect(Dummy.join(left, right)).toBeFalsy();
    });

  });

  describe('The iteratorsHaveMetadata function', () => {
    let action: IActionRdfJoin;

    beforeEach(() => {
      action = { left: null, right: null, leftMetadata: {}, rightMetadata: {} };
    });

    it('should return false if there is no left metadata', () => {
      action.leftMetadata = null;
      return expect(Dummy.iteratorsHaveMetadata(action, 'key')).toBeFalsy();
    });

    it('should return false if there is no right metadata', () => {
      action.rightMetadata = null;
      return expect(Dummy.iteratorsHaveMetadata(action, 'key')).toBeFalsy();
    });

    it('should return false if no relevant left metadata', () => {
      action.rightMetadata.key = 5;
      return expect(Dummy.iteratorsHaveMetadata(action, 'key')).toBeFalsy();
    });

    it('should return false if no relevant right metadata', () => {
      action.leftMetadata.key = 5;
      return expect(Dummy.iteratorsHaveMetadata(action, 'key')).toBeFalsy();
    });

    it('should return true if both have the relevant metadata', () => {
      action.leftMetadata.key = 5;
      action.rightMetadata.key = 10;
      return expect(Dummy.iteratorsHaveMetadata(action, 'key')).toBeTruthy();
    });
  });
});
