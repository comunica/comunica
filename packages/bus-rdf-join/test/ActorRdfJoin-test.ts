
import {Bindings} from "@comunica/bus-query-operation";
import {literal} from "rdf-data-model";
import {ActorRdfJoin, IActionRdfJoin} from "../lib/ActorRdfJoin";

// dummy class to test protected functions
abstract class Dummy extends ActorRdfJoin {

  public static join(left: Bindings, right: Bindings): Bindings {
    return ActorRdfJoin.join(left, right);
  }

  public static iteratorsHaveMetadata(action: IActionRdfJoin, key: string): boolean {
    return ActorRdfJoin.iteratorsHaveMetadata(action, key);
  }
}

describe('ActorRdfJoin', () => {

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
