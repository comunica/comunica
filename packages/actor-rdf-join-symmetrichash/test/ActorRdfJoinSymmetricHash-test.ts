import {Bindings} from "@comunica/bus-query-operation";
import {ActorRdfJoin, IActionRdfJoin} from "@comunica/bus-rdf-join";
import {Bus} from "@comunica/core";
import {ArrayIterator} from "asynciterator";
import {literal} from "rdf-data-model";
import {ActorRdfJoinSymmetricHash} from "../lib/ActorRdfJoinSymmetricHash";
const arrayifyStream = require('arrayify-stream');

function bindingsToString(b: Bindings): string {
  const keys = b.keySeq().toArray().sort();
  return keys.map((k) => `${k}:${b.get(k).value}`).toString();
}

describe('ActorRdfJoinSymmetricHash', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfJoinSymmetricHash module', () => {
    it('should be a function', () => {
      expect(ActorRdfJoinSymmetricHash).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfJoinSymmetricHash constructor', () => {
      expect(new (<any> ActorRdfJoinSymmetricHash)({ name: 'actor', bus })).toBeInstanceOf(ActorRdfJoinSymmetricHash);
      expect(new (<any> ActorRdfJoinSymmetricHash)({ name: 'actor', bus })).toBeInstanceOf(ActorRdfJoin);
    });

    it('should not be able to create new ActorRdfJoinSymmetricHash objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfJoinSymmetricHash)(); }).toThrow();
    });
  });

  describe('An ActorRdfJoinSymmetricHash instance', () => {
    let actor: ActorRdfJoinSymmetricHash;
    let action: IActionRdfJoin;

    beforeEach(() => {
      actor = new ActorRdfJoinSymmetricHash({ name: 'actor', bus });
      action = {
        left: new ArrayIterator([]), leftMetadata: { totalItems: 4 }, leftVariables: [],
        right: new ArrayIterator([]), rightMetadata: { totalItems: 5 }, rightVariables: [],
      };
    });

    // uses default test implementation from ActorRdfJoin
    // it('should test', () => {
    // });

    it('should generate correct metadata', () => {
      return expect(actor.run(action)).resolves.toHaveProperty('metadata.totalItems',
        action.leftMetadata.totalItems + action.rightMetadata.totalItems);
    });

    it('should not return metadata if there is no valid input', () => {
      delete action.leftMetadata;
      return expect(actor.run(action)).resolves.not.toHaveProperty('metadata');
    });

    it('should return an empty stream for empty input', () => {
      return actor.run(action).then(async (output) => {
        expect(output.variables).toEqual([]);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([]);
      });
    });

    it('should join bindings with matching values', () => {
      action.left = new ArrayIterator([Bindings({ a: literal('a'), b: literal('b')})]);
      action.leftVariables = ['a', 'b'];
      action.right = new ArrayIterator([Bindings({ a: literal('a'), c: literal('c')})]);
      action.rightVariables = ['a', 'c'];
      return actor.run(action).then(async (output) => {
        expect(output.variables).toEqual(['a', 'b', 'c']);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: literal('a'), b: literal('b'), c: literal('c')}),
        ]);
      });
    });

    it('should not join bindings with incompatible values', () => {
      action.left = new ArrayIterator([Bindings({ a: literal('a'), b: literal('b')})]);
      action.leftVariables = ['a', 'b'];
      action.right = new ArrayIterator([Bindings({ a: literal('d'), c: literal('c')})]);
      action.rightVariables = ['a', 'c'];
      return actor.run(action).then(async (output) => {
        expect(output.variables).toEqual(['a', 'b', 'c']);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([]);
      });
    });

    it('should join multiple bindings', () => {
      action.left = new ArrayIterator([
        Bindings({ a: literal('1'), b: literal('2')}),
        Bindings({ a: literal('1'), b: literal('3')}),
        Bindings({ a: literal('2'), b: literal('2')}),
        Bindings({ a: literal('2'), b: literal('3')}),
        Bindings({ a: literal('3'), b: literal('3')}),
        Bindings({ a: literal('3'), b: literal('4')}),
      ]);
      action.leftVariables = ['a', 'b'];
      action.right = new ArrayIterator([
        Bindings({ a: literal('1'), c: literal('4')}),
        Bindings({ a: literal('1'), c: literal('5')}),
        Bindings({ a: literal('2'), c: literal('6')}),
        Bindings({ a: literal('3'), c: literal('7')}),
        Bindings({ a: literal('0'), c: literal('4')}),
        Bindings({ a: literal('0'), c: literal('4')}),
      ]);
      action.rightVariables = ['a', 'c'];
      return actor.run(action).then(async (output) => {
        const expected = [
          Bindings({ a: literal('1'), b: literal('2'), c: literal('4') }),
          Bindings({ a: literal('1'), b: literal('2'), c: literal('5') }),
          Bindings({ a: literal('1'), b: literal('3'), c: literal('4') }),
          Bindings({ a: literal('1'), b: literal('3'), c: literal('5') }),
          Bindings({ a: literal('2'), b: literal('2'), c: literal('6') }),
          Bindings({ a: literal('2'), b: literal('3'), c: literal('6') }),
          Bindings({ a: literal('3'), b: literal('3'), c: literal('7') }),
          Bindings({ a: literal('3'), b: literal('4'), c: literal('7') }),
        ];
        expect(output.variables).toEqual(['a', 'b', 'c']);
        // mapping to string and sorting since we don't know order (well, we sort of know, but we might not!)
        expect((await arrayifyStream(output.bindingsStream)).map(bindingsToString).sort())
          .toEqual(expected.map(bindingsToString).sort());
      });
    });
  });
});
