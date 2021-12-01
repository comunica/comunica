import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { IActionRdfJoinSelectivity, IActorRdfJoinSelectivityOutput } from '@comunica/bus-rdf-join-selectivity';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import { Bus } from '@comunica/core';
import type { IQueryableResultBindings, Bindings } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorRdfJoinNestedLoop } from '../lib/ActorRdfJoinNestedLoop';
const arrayifyStream = require('arrayify-stream');

const DF = new DataFactory();
const BF = new BindingsFactory();

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
    let mediatorJoinSelectivity: Mediator<
    Actor<IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>,
    IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>;
    let actor: ActorRdfJoinNestedLoop;
    let action: IActionRdfJoin;

    beforeEach(() => {
      mediatorJoinSelectivity = <any> {
        mediate: async() => ({ selectivity: 1 }),
      };
      actor = new ActorRdfJoinNestedLoop({ name: 'actor', bus, mediatorJoinSelectivity });
      action = {
        type: 'inner',
        entries: [
          {
            output: {
              bindingsStream: new ArrayIterator([], { autoStart: false }),
              metadata: async() => ({ cardinality: 4, pageSize: 100, requestTime: 10, canContainUndefs: false }),
              type: 'bindings',
              variables: [],
            },
            operation: <any> {},
          },
          {
            output: {
              bindingsStream: new ArrayIterator([], { autoStart: false }),
              metadata: async() => ({ cardinality: 5, pageSize: 100, requestTime: 20, canContainUndefs: false }),
              type: 'bindings',
              variables: [],
            },
            operation: <any> {},
          },
        ],
      };
    });

    it('should only handle 2 streams', () => {
      action.entries.push(<any> {});
      return expect(actor.test(action)).rejects.toBeTruthy();
    });

    it('should handle undefs in left stream', () => {
      action.entries[0].output
        .metadata = async() => ({ cardinality: 4, pageSize: 100, requestTime: 10, canContainUndefs: true });
      return expect(actor.test(action)).resolves
        .toEqual({
          iterations: 20,
          persistedItems: 0,
          blockingItems: 0,
          requestTime: 1.4,
        });
    });

    it('should handle undefs in right stream', () => {
      action.entries[1].output
        .metadata = async() => ({ cardinality: 5, pageSize: 100, requestTime: 20, canContainUndefs: true });
      return expect(actor.test(action)).resolves
        .toEqual({
          iterations: 20,
          persistedItems: 0,
          blockingItems: 0,
          requestTime: 1.4,
        });
    });

    it('should handle undefs in left and right stream', () => {
      action.entries[0].output
        .metadata = async() => ({ cardinality: 4, pageSize: 100, requestTime: 10, canContainUndefs: true });
      action.entries[1].output
        .metadata = async() => ({ cardinality: 5, pageSize: 100, requestTime: 20, canContainUndefs: true });
      return expect(actor.test(action)).resolves
        .toEqual({
          iterations: 20,
          persistedItems: 0,
          blockingItems: 0,
          requestTime: 1.4,
        });
    });

    it('should generate correct test metadata', async() => {
      await expect(actor.test(action)).resolves.toHaveProperty('iterations',
        (await (<any> action.entries[0].output).metadata()).cardinality *
        (await (<any> action.entries[1].output).metadata()).cardinality);
    });

    it('should generate correct metadata', async() => {
      await actor.run(action).then(async(result: IQueryableResultBindings) => {
        return expect((<any> result).metadata()).resolves.toHaveProperty('cardinality',
          (await (<any> action.entries[0].output).metadata()).cardinality *
          (await (<any> action.entries[1].output).metadata()).cardinality);
      });
    });

    it('should return an empty stream for empty input', () => {
      return actor.run(action).then(async(output: IQueryableResultBindings) => {
        expect(output.variables).toEqual([]);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([]);
      });
    });

    it('should join bindings with matching values', () => {
      action.entries[0].output.bindingsStream = new ArrayIterator([
        BF.bindings({ a: DF.literal('a'), b: DF.literal('b') }),
      ]);
      action.entries[0].output.variables = [ 'a', 'b' ];
      action.entries[1].output.bindingsStream = new ArrayIterator([
        BF.bindings({ a: DF.literal('a'), c: DF.literal('c') }),
      ]);
      action.entries[1].output.variables = [ 'a', 'c' ];
      return actor.run(action).then(async(output: IQueryableResultBindings) => {
        expect(output.variables).toEqual([ 'a', 'b', 'c' ]);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          BF.bindings({ a: DF.literal('a'), b: DF.literal('b'), c: DF.literal('c') }),
        ]);
      });
    });

    it('should not join bindings with incompatible values', () => {
      action.entries[0].output.bindingsStream = new ArrayIterator([
        BF.bindings({ a: DF.literal('a'), b: DF.literal('b') }),
      ]);
      action.entries[0].output.variables = [ 'a', 'b' ];
      action.entries[1].output.bindingsStream = new ArrayIterator([
        BF.bindings({ a: DF.literal('d'), c: DF.literal('c') }),
      ]);
      action.entries[1].output.variables = [ 'a', 'c' ];
      return actor.run(action).then(async(output: IQueryableResultBindings) => {
        expect(output.variables).toEqual([ 'a', 'b', 'c' ]);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([]);
      });
    });

    it('should join multiple bindings', () => {
      action.entries[0].output.bindingsStream = new ArrayIterator([
        BF.bindings({ a: DF.literal('1'), b: DF.literal('2') }),
        BF.bindings({ a: DF.literal('1'), b: DF.literal('3') }),
        BF.bindings({ a: DF.literal('2'), b: DF.literal('2') }),
        BF.bindings({ a: DF.literal('2'), b: DF.literal('3') }),
        BF.bindings({ a: DF.literal('3'), b: DF.literal('3') }),
        BF.bindings({ a: DF.literal('3'), b: DF.literal('4') }),
      ]);
      action.entries[0].output.variables = [ 'a', 'b' ];
      action.entries[1].output.bindingsStream = new ArrayIterator([
        BF.bindings({ a: DF.literal('1'), c: DF.literal('4') }),
        BF.bindings({ a: DF.literal('1'), c: DF.literal('5') }),
        BF.bindings({ a: DF.literal('2'), c: DF.literal('6') }),
        BF.bindings({ a: DF.literal('3'), c: DF.literal('7') }),
        BF.bindings({ a: DF.literal('0'), c: DF.literal('4') }),
        BF.bindings({ a: DF.literal('0'), c: DF.literal('4') }),
      ]);
      action.entries[1].output.variables = [ 'a', 'c' ];
      return actor.run(action).then(async(output: IQueryableResultBindings) => {
        const expected = [
          BF.bindings({ a: DF.literal('1'), b: DF.literal('2'), c: DF.literal('4') }),
          BF.bindings({ a: DF.literal('1'), b: DF.literal('2'), c: DF.literal('5') }),
          BF.bindings({ a: DF.literal('1'), b: DF.literal('3'), c: DF.literal('4') }),
          BF.bindings({ a: DF.literal('1'), b: DF.literal('3'), c: DF.literal('5') }),
          BF.bindings({ a: DF.literal('2'), b: DF.literal('2'), c: DF.literal('6') }),
          BF.bindings({ a: DF.literal('2'), b: DF.literal('3'), c: DF.literal('6') }),
          BF.bindings({ a: DF.literal('3'), b: DF.literal('3'), c: DF.literal('7') }),
          BF.bindings({ a: DF.literal('3'), b: DF.literal('4'), c: DF.literal('7') }),
        ];
        expect(output.variables).toEqual([ 'a', 'b', 'c' ]);
        // Mapping to string and sorting since we don't know order (well, we sort of know, but we might not!)
        expect((await arrayifyStream(output.bindingsStream)).map(bindingsToString).sort())
          // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
          .toEqual(expected.map(bindingsToString).sort());
      });
    });

    it('should join multiple bindings with undefs', () => {
      action.entries[0].output.bindingsStream = new ArrayIterator([
        BF.bindings({ a: DF.literal('1'), b: DF.literal('2') }),
        BF.bindings({ a: DF.literal('2'), b: DF.literal('3') }),
      ]);
      action.entries[0].output.variables = [ 'a', 'b' ];
      action.entries[1].output.bindingsStream = new ArrayIterator([
        BF.bindings({ a: DF.literal('1'), c: DF.literal('4') }),
        BF.bindings({ c: DF.literal('5') }),
      ]);
      action.entries[1].output
        .metadata = async() => ({ cardinality: 5, pageSize: 100, requestTime: 20, canContainUndefs: true });
      action.entries[1].output.variables = [ 'a', 'c' ];
      return actor.run(action).then(async(output: IQueryableResultBindings) => {
        const expected = [
          BF.bindings({ a: DF.literal('1'), b: DF.literal('2'), c: DF.literal('4') }),
          BF.bindings({ a: DF.literal('1'), b: DF.literal('2'), c: DF.literal('5') }),
          BF.bindings({ a: DF.literal('2'), b: DF.literal('3'), c: DF.literal('5') }),
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
