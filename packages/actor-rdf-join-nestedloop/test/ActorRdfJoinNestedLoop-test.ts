import {Bindings} from "@comunica/bus-query-operation";
import {ActorRdfJoin, IActionRdfJoin} from "@comunica/bus-rdf-join";
import {Bus} from "@comunica/core";
import {ArrayIterator} from "asynciterator";
import {literal} from "rdf-data-model";
import {ActorRdfJoinNestedLoop} from "../lib/ActorRdfJoinNestedLoop";
const arrayifyStream = require('arrayify-stream');

function bindingsToString(b: Bindings): string {
  const keys = b.keySeq().toArray().sort();
  return keys.map((k) => `${k}:${b.get(k).value}`).toString();
}

describe('ActorRdfJoinNestedLoop', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfJoinNestedLoop module', () => {
    it('should be a function', () => {
      expect(ActorRdfJoinNestedLoop).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfJoinNestedLoop constructor', () => {
      expect(new (<any> ActorRdfJoinNestedLoop)({ name: 'actor', bus })).toBeInstanceOf(ActorRdfJoinNestedLoop);
      expect(new (<any> ActorRdfJoinNestedLoop)({ name: 'actor', bus })).toBeInstanceOf(ActorRdfJoin);
    });

    it('should not be able to create new ActorRdfJoinNestedLoop objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfJoinNestedLoop)(); }).toThrow();
    });
  });

  describe('An ActorRdfJoinNestedLoop instance', () => {
    let actor: ActorRdfJoinNestedLoop;
    let action: IActionRdfJoin;

    beforeEach(() => {
      actor = new ActorRdfJoinNestedLoop({ name: 'actor', bus });
      action = {
        left: new ArrayIterator([]), leftMetadata: { totalItems: 4 },
        right: new ArrayIterator([]), rightMetadata: { totalItems: 5 },
      };
    });

    // uses default test implementation from ActorRdfJoin
    // it('should test', () => {
    // });

    it('should generate correct metadata', () => {
      return expect(actor.run(action)).resolves.toHaveProperty('metadata.totalItems',
        action.leftMetadata.totalItems * action.rightMetadata.totalItems);
    });

    it('should not return metadata if there is no valid input', () => {
      delete action.leftMetadata;
      return expect(actor.run(action)).resolves.not.toHaveProperty('metadata');
    });

    it('should return an empty stream for empty input', () => {
      return actor.run(action).then(async (output) => {
        expect(await arrayifyStream(output.bindingsStream)).toEqual([]);
      });
    });

    it('should join bindings with matching values', () => {
      action.left = new ArrayIterator([Bindings({ a: literal('a'), b: literal('b')})]);
      action.right = new ArrayIterator([Bindings({ a: literal('a'), c: literal('c')})]);
      return actor.run(action).then(async (output) => {
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: literal('a'), b: literal('b'), c: literal('c')}),
        ]);
      });
    });

    it('should not join bindings with incompatible values', () => {
      action.left = new ArrayIterator([Bindings({ a: literal('a'), b: literal('b')})]);
      action.right = new ArrayIterator([Bindings({ a: literal('d'), c: literal('c')})]);
      return actor.run(action).then(async (output) => {
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
      action.right = new ArrayIterator([
        Bindings({ a: literal('1'), c: literal('4')}),
        Bindings({ a: literal('1'), c: literal('5')}),
        Bindings({ a: literal('2'), c: literal('6')}),
        Bindings({ a: literal('3'), c: literal('7')}),
        Bindings({ a: literal('0'), c: literal('4')}),
        Bindings({ a: literal('0'), c: literal('4')}),
        Bindings({ b: literal('4'), c: literal('4')}),
      ]);
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
          Bindings({ a: literal('3'), b: literal('4'), c: literal('4') }),
        ];
        // mapping to string and sorting since we don't know order (well, we sort of know, but we might not!)
        expect((await arrayifyStream(output.bindingsStream)).map(bindingsToString).sort())
          .toEqual(expected.map(bindingsToString).sort());
      });
    });
  });
});
