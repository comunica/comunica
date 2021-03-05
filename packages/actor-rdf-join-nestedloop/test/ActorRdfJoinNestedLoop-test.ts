import { Bindings } from '@comunica/bus-query-operation';
import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import { Bus } from '@comunica/core';
import type { IActorQueryOperationOutputBindings } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorRdfJoinNestedLoop } from '../lib/ActorRdfJoinNestedLoop';
const arrayifyStream = require('arrayify-stream');
const DF = new DataFactory();

function bindingsToString(b: Bindings): string {
  // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
  const keys = b.keySeq().toArray().sort();
  return keys.map(k => `${k}:${b.get(k).value}`).toString();
}

describe('ActorRdfJoinNestedLoop', () => {
  let bus: any;

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
      action = { entries: [
        {
          bindingsStream: new ArrayIterator([], { autoStart: false }),
          metadata: () => Promise.resolve({ totalItems: 4 }),
          type: 'bindings',
          variables: [],
          canContainUndefs: false,
        },
        {
          bindingsStream: new ArrayIterator([], { autoStart: false }),
          metadata: () => Promise.resolve({ totalItems: 5 }),
          type: 'bindings',
          variables: [],
          canContainUndefs: false,
        },
      ]};
    });

    it('should only handle 2 streams', () => {
      action.entries.push(<any> {});
      return expect(actor.test(action)).rejects.toBeTruthy();
    });

    it('should handle undefs in left stream', () => {
      action.entries[0].canContainUndefs = true;
      return expect(actor.test(action)).resolves
        .toEqual({ iterations: 20 });
    });

    it('should handle undefs in right stream', () => {
      action.entries[1].canContainUndefs = true;
      return expect(actor.test(action)).resolves
        .toEqual({ iterations: 20 });
    });

    it('should handle undefs in left and right stream', () => {
      action.entries[0].canContainUndefs = true;
      action.entries[1].canContainUndefs = true;
      return expect(actor.test(action)).resolves
        .toEqual({ iterations: 20 });
    });

    it('should generate correct test metadata', async() => {
      await expect(actor.test(action)).resolves.toHaveProperty('iterations',
        (await (<any> action.entries[0]).metadata()).totalItems *
        (await (<any> action.entries[1]).metadata()).totalItems);
    });

    it('should generate correct metadata', async() => {
      await actor.run(action).then(async(result: IActorQueryOperationOutputBindings) => {
        return expect((<any> result).metadata()).resolves.toHaveProperty('totalItems',
          (await (<any> action.entries[0]).metadata()).totalItems *
          (await (<any> action.entries[1]).metadata()).totalItems);
      });
    });

    it('should not return metadata if there is no valid input', () => {
      delete action.entries[0].metadata;
      return expect(actor.run(action)).resolves.not.toHaveProperty('metadata');
    });

    it('should return an empty stream for empty input', () => {
      return actor.run(action).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual([]);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([]);
      });
    });

    it('should join bindings with matching values', () => {
      action.entries[0].bindingsStream = new ArrayIterator([ Bindings({ a: DF.literal('a'), b: DF.literal('b') }) ]);
      action.entries[0].variables = [ 'a', 'b' ];
      action.entries[1].bindingsStream = new ArrayIterator([ Bindings({ a: DF.literal('a'), c: DF.literal('c') }) ]);
      action.entries[1].variables = [ 'a', 'c' ];
      return actor.run(action).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual([ 'a', 'b', 'c' ]);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: DF.literal('a'), b: DF.literal('b'), c: DF.literal('c') }),
        ]);
      });
    });

    it('should not join bindings with incompatible values', () => {
      action.entries[0].bindingsStream = new ArrayIterator([ Bindings({ a: DF.literal('a'), b: DF.literal('b') }) ]);
      action.entries[0].variables = [ 'a', 'b' ];
      action.entries[1].bindingsStream = new ArrayIterator([ Bindings({ a: DF.literal('d'), c: DF.literal('c') }) ]);
      action.entries[1].variables = [ 'a', 'c' ];
      return actor.run(action).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual([ 'a', 'b', 'c' ]);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([]);
      });
    });

    it('should join multiple bindings', () => {
      action.entries[0].bindingsStream = new ArrayIterator([
        Bindings({ a: DF.literal('1'), b: DF.literal('2') }),
        Bindings({ a: DF.literal('1'), b: DF.literal('3') }),
        Bindings({ a: DF.literal('2'), b: DF.literal('2') }),
        Bindings({ a: DF.literal('2'), b: DF.literal('3') }),
        Bindings({ a: DF.literal('3'), b: DF.literal('3') }),
        Bindings({ a: DF.literal('3'), b: DF.literal('4') }),
      ]);
      action.entries[0].variables = [ 'a', 'b' ];
      action.entries[1].bindingsStream = new ArrayIterator([
        Bindings({ a: DF.literal('1'), c: DF.literal('4') }),
        Bindings({ a: DF.literal('1'), c: DF.literal('5') }),
        Bindings({ a: DF.literal('2'), c: DF.literal('6') }),
        Bindings({ a: DF.literal('3'), c: DF.literal('7') }),
        Bindings({ a: DF.literal('0'), c: DF.literal('4') }),
        Bindings({ a: DF.literal('0'), c: DF.literal('4') }),
      ]);
      action.entries[1].variables = [ 'a', 'c' ];
      return actor.run(action).then(async(output: IActorQueryOperationOutputBindings) => {
        const expected = [
          Bindings({ a: DF.literal('1'), b: DF.literal('2'), c: DF.literal('4') }),
          Bindings({ a: DF.literal('1'), b: DF.literal('2'), c: DF.literal('5') }),
          Bindings({ a: DF.literal('1'), b: DF.literal('3'), c: DF.literal('4') }),
          Bindings({ a: DF.literal('1'), b: DF.literal('3'), c: DF.literal('5') }),
          Bindings({ a: DF.literal('2'), b: DF.literal('2'), c: DF.literal('6') }),
          Bindings({ a: DF.literal('2'), b: DF.literal('3'), c: DF.literal('6') }),
          Bindings({ a: DF.literal('3'), b: DF.literal('3'), c: DF.literal('7') }),
          Bindings({ a: DF.literal('3'), b: DF.literal('4'), c: DF.literal('7') }),
        ];
        expect(output.variables).toEqual([ 'a', 'b', 'c' ]);
        // Mapping to string and sorting since we don't know order (well, we sort of know, but we might not!)
        expect((await arrayifyStream(output.bindingsStream)).map(bindingsToString).sort())
          // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
          .toEqual(expected.map(bindingsToString).sort());
      });
    });

    it('should join multiple bindings with undefs', () => {
      action.entries[0].bindingsStream = new ArrayIterator([
        Bindings({ a: DF.literal('1'), b: DF.literal('2') }),
        Bindings({ a: DF.literal('2'), b: DF.literal('3') }),
      ]);
      action.entries[0].variables = [ 'a', 'b' ];
      action.entries[1].bindingsStream = new ArrayIterator([
        Bindings({ a: DF.literal('1'), c: DF.literal('4') }),
        Bindings({ c: DF.literal('5') }),
      ]);
      action.entries[1].canContainUndefs = true;
      action.entries[1].variables = [ 'a', 'c' ];
      return actor.run(action).then(async(output: IActorQueryOperationOutputBindings) => {
        const expected = [
          Bindings({ a: DF.literal('1'), b: DF.literal('2'), c: DF.literal('4') }),
          Bindings({ a: DF.literal('1'), b: DF.literal('2'), c: DF.literal('5') }),
          Bindings({ a: DF.literal('2'), b: DF.literal('3'), c: DF.literal('5') }),
        ];
        expect(output.variables).toEqual([ 'a', 'b', 'c' ]);
        // Mapping to string and sorting since we don't know order (well, we sort of know, but we might not!)
        expect((await arrayifyStream(output.bindingsStream)).map(bindingsToString).sort())
          // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
          .toEqual(expected.map(bindingsToString).sort());
      });
    });
  });
});
