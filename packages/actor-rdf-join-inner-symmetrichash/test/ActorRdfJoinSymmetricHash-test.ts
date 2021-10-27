import { Bindings } from '@comunica/bus-query-operation';
import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { IActionRdfJoinSelectivity, IActorRdfJoinSelectivityOutput } from '@comunica/bus-rdf-join-selectivity';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import { Bus } from '@comunica/core';
import type { IActorQueryOperationOutputBindings } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorRdfJoinSymmetricHash } from '../lib/ActorRdfJoinSymmetricHash';
const arrayifyStream = require('arrayify-stream');
const DF = new DataFactory();

function bindingsToString(b: Bindings): string {
  // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
  const keys = b.keySeq().toArray().sort();
  return keys.map(k => `${k}:${b.get(k).value}`).toString();
}

describe('ActorRdfJoinSymmetricHash', () => {
  let bus: any;

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
    let mediatorJoinSelectivity: Mediator<
    Actor<IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>,
    IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>;
    let actor: ActorRdfJoinSymmetricHash;
    let action: IActionRdfJoin;

    beforeEach(() => {
      mediatorJoinSelectivity = <any> {
        mediate: async() => ({ selectivity: 1 }),
      };
      actor = new ActorRdfJoinSymmetricHash({ name: 'actor', bus, mediatorJoinSelectivity });
      action = {
        type: 'inner',
        entries: [
          {
            output: {
              bindingsStream: new ArrayIterator([], { autoStart: false }),
              metadata: () => Promise.resolve({ cardinality: 4, canContainUndefs: false }),
              type: 'bindings',
              variables: [],
            },
            operation: <any> {},
          },
          {
            output: {
              bindingsStream: new ArrayIterator([], { autoStart: false }),
              metadata: () => Promise.resolve({ cardinality: 5, canContainUndefs: false }),
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

    it('should fail on undefs in left stream', () => {
      action = {
        type: 'inner',
        entries: [
          {
            output: {
              bindingsStream: new ArrayIterator([], { autoStart: false }),
              metadata: () => Promise.resolve({ cardinality: 4, canContainUndefs: true }),
              type: 'bindings',
              variables: [],
            },
            operation: <any> {},
          },
          {
            output: {
              bindingsStream: new ArrayIterator([], { autoStart: false }),
              metadata: () => Promise.resolve({ cardinality: 5, canContainUndefs: false }),
              type: 'bindings',
              variables: [],
            },
            operation: <any> {},
          },
        ],
      };
      return expect(actor.test(action)).rejects
        .toThrow(new Error('Actor actor can not join streams containing undefs'));
    });

    it('should fail on undefs in right stream', () => {
      action = {
        type: 'inner',
        entries: [
          {
            output: {
              bindingsStream: new ArrayIterator([], { autoStart: false }),
              metadata: () => Promise.resolve({ cardinality: 4, canContainUndefs: false }),
              type: 'bindings',
              variables: [],
            },
            operation: <any> {},
          },
          {
            output: {
              bindingsStream: new ArrayIterator([], { autoStart: false }),
              metadata: () => Promise.resolve({ cardinality: 5, canContainUndefs: true }),
              type: 'bindings',
              variables: [],
            },
            operation: <any> {},
          },
        ],
      };
      return expect(actor.test(action)).rejects
        .toThrow(new Error('Actor actor can not join streams containing undefs'));
    });

    it('should fail on undefs in left and right stream', () => {
      action = {
        type: 'inner',
        entries: [
          {
            output: {
              bindingsStream: new ArrayIterator([], { autoStart: false }),
              metadata: () => Promise.resolve({ cardinality: 4, canContainUndefs: true }),
              type: 'bindings',
              variables: [],
            },
            operation: <any> {},
          },
          {
            output: {
              bindingsStream: new ArrayIterator([], { autoStart: false }),
              metadata: () => Promise.resolve({ cardinality: 5, canContainUndefs: true }),
              type: 'bindings',
              variables: [],
            },
            operation: <any> {},
          },
        ],
      };
      return expect(actor.test(action)).rejects
        .toThrow(new Error('Actor actor can not join streams containing undefs'));
    });

    it('should generate correct test metadata', async() => {
      await expect(actor.test(action)).resolves.toHaveProperty('iterations',
        (await (<any> action.entries[0].output).metadata()).cardinality +
        (await (<any> action.entries[1].output).metadata()).cardinality);
    });

    it('should generate correct metadata', async() => {
      await actor.run(action).then(async(result: IActorQueryOperationOutputBindings) => {
        return expect((<any> result).metadata()).resolves.toHaveProperty('cardinality',
          (await (<any> action.entries[0].output).metadata()).cardinality *
          (await (<any> action.entries[1].output).metadata()).cardinality);
      });
    });

    it('should return an empty stream for empty input', () => {
      return actor.run(action).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual([]);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([]);
      });
    });

    it('should join bindings with matching values', () => {
      action.entries[0].output.bindingsStream = new ArrayIterator([
        Bindings({ a: DF.literal('a'), b: DF.literal('b') }),
      ]);
      action.entries[0].output.variables = [ 'a', 'b' ];
      action.entries[1].output.bindingsStream = new ArrayIterator([
        Bindings({ a: DF.literal('a'), c: DF.literal('c') }),
      ]);
      action.entries[1].output.variables = [ 'a', 'c' ];
      return actor.run(action).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual([ 'a', 'b', 'c' ]);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: DF.literal('a'), b: DF.literal('b'), c: DF.literal('c') }),
        ]);
      });
    });

    it('should not join bindings with incompatible values', () => {
      action.entries[0].output.bindingsStream = new ArrayIterator([
        Bindings({ a: DF.literal('a'), b: DF.literal('b') }),
      ]);
      action.entries[0].output.variables = [ 'a', 'b' ];
      action.entries[1].output.bindingsStream = new ArrayIterator([
        Bindings({ a: DF.literal('d'), c: DF.literal('c') }),
      ]);
      action.entries[1].output.variables = [ 'a', 'c' ];
      return actor.run(action).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual([ 'a', 'b', 'c' ]);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([]);
      });
    });

    it('should join multiple bindings', () => {
      action.entries[0].output.bindingsStream = new ArrayIterator([
        Bindings({ a: DF.literal('1'), b: DF.literal('2') }),
        Bindings({ a: DF.literal('1'), b: DF.literal('3') }),
        Bindings({ a: DF.literal('2'), b: DF.literal('2') }),
        Bindings({ a: DF.literal('2'), b: DF.literal('3') }),
        Bindings({ a: DF.literal('3'), b: DF.literal('3') }),
        Bindings({ a: DF.literal('3'), b: DF.literal('4') }),
      ]);
      action.entries[0].output.variables = [ 'a', 'b' ];
      action.entries[1].output.bindingsStream = new ArrayIterator([
        Bindings({ a: DF.literal('1'), c: DF.literal('4') }),
        Bindings({ a: DF.literal('1'), c: DF.literal('5') }),
        Bindings({ a: DF.literal('2'), c: DF.literal('6') }),
        Bindings({ a: DF.literal('3'), c: DF.literal('7') }),
        Bindings({ a: DF.literal('0'), c: DF.literal('4') }),
        Bindings({ a: DF.literal('0'), c: DF.literal('4') }),
      ]);
      action.entries[1].output.variables = [ 'a', 'c' ];
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

    it('should hash to concatenation of values of variables', () => {
      expect(ActorRdfJoinSymmetricHash.hash(
        Bindings({ '?x': DF.namedNode('http://www.example.org/instance#a'),
          '?y': DF.namedNode('http://www.example.org/instance#b') }), [ '?x', '?y' ],
      )).toEqual('http://www.example.org/instance#ahttp://www.example.org/instance#b');
    });

    it('should not let hash being influenced by a variable that is not present in bindings', () => {
      expect(ActorRdfJoinSymmetricHash.hash(
        Bindings({ '?x': DF.namedNode('http://www.example.org/instance#a'),
          '?y': DF.namedNode('http://www.example.org/instance#b') }), [ '?x', '?y', '?z' ],
      )).toEqual('http://www.example.org/instance#ahttp://www.example.org/instance#b');
    });
  });
});
