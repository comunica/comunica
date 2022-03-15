import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { IActionRdfJoinSelectivity, IActorRdfJoinSelectivityOutput } from '@comunica/bus-rdf-join-selectivity';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import { ActionContext, Bus } from '@comunica/core';
import type { IQueryOperationResultBindings, Bindings, IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorRdfJoinNestedLoop } from '../lib/ActorRdfJoinNestedLoop';
import '@comunica/jest';

const DF = new DataFactory();
const BF = new BindingsFactory();

function bindingsToString(b: Bindings): string {
  // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
  const keys = [ ...b.keys() ].sort();
  return keys.map(k => `${k.value}:${b.get(k)!.value}`).toString();
}

describe('ActorRdfJoinNestedLoop', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
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
    let variables0: RDF.Variable[];
    let variables1: RDF.Variable[];

    beforeEach(() => {
      mediatorJoinSelectivity = <any> {
        mediate: async() => ({ selectivity: 1 }),
      };
      actor = new ActorRdfJoinNestedLoop({ name: 'actor', bus, mediatorJoinSelectivity });
      variables0 = [];
      variables1 = [];
      action = {
        type: 'inner',
        entries: [
          {
            output: {
              bindingsStream: new ArrayIterator([], { autoStart: false }),
              metadata: async() => ({
                cardinality: { type: 'estimate', value: 4 },
                pageSize: 100,
                requestTime: 10,
                canContainUndefs: false,
                variables: variables0,
              }),
              type: 'bindings',
            },
            operation: <any> {},
          },
          {
            output: {
              bindingsStream: new ArrayIterator([], { autoStart: false }),
              metadata: async() => ({
                cardinality: { type: 'estimate', value: 5 },
                pageSize: 100,
                requestTime: 20,
                canContainUndefs: false,
                variables: variables1,
              }),
              type: 'bindings',
            },
            operation: <any> {},
          },
        ],
        context,
      };
    });

    it('should only handle 2 streams', () => {
      action.entries.push(<any> {});
      return expect(actor.test(action)).rejects.toBeTruthy();
    });

    it('should handle undefs in left stream', () => {
      action.entries[0].output.metadata = async() => ({
        cardinality: { type: 'estimate', value: 4 },
        pageSize: 100,
        requestTime: 10,
        canContainUndefs: true,
        variables: [],
      });
      return expect(actor.test(action)).resolves
        .toEqual({
          iterations: 20,
          persistedItems: 0,
          blockingItems: 0,
          requestTime: 1.4,
        });
    });

    it('should handle undefs in right stream', () => {
      action.entries[1].output.metadata = async() => ({
        cardinality: { type: 'estimate', value: 5 },
        pageSize: 100,
        requestTime: 20,
        canContainUndefs: true,
        variables: [],
      });
      return expect(actor.test(action)).resolves
        .toEqual({
          iterations: 20,
          persistedItems: 0,
          blockingItems: 0,
          requestTime: 1.4,
        });
    });

    it('should handle undefs in left and right stream', () => {
      action.entries[0].output.metadata = async() => ({
        cardinality: { type: 'estimate', value: 4 },
        pageSize: 100,
        requestTime: 10,
        canContainUndefs: true,
        variables: [],
      });
      action.entries[1].output.metadata = async() => ({
        cardinality: { type: 'estimate', value: 5 },
        pageSize: 100,
        requestTime: 20,
        canContainUndefs: true,
        variables: [],
      });
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
        (await (<any> action.entries[0].output).metadata()).cardinality.value *
        (await (<any> action.entries[1].output).metadata()).cardinality.value);
    });

    it('should generate correct metadata', async() => {
      await actor.run(action).then(async(result: IQueryOperationResultBindings) => {
        return expect((<any> result).metadata()).resolves.toHaveProperty('cardinality',
          { type: 'estimate',
            value: (await (<any> action.entries[0].output).metadata()).cardinality.value *
          (await (<any> action.entries[1].output).metadata()).cardinality.value });
      });
    });

    it('should return an empty stream for empty input', () => {
      return actor.run(action).then(async(output: IQueryOperationResultBindings) => {
        expect((await output.metadata()).variables).toEqual([]);
        await expect(output.bindingsStream).toEqualBindingsStream([]);
      });
    });

    it('should join bindings with matching values', () => {
      action.entries[0].output.bindingsStream = new ArrayIterator([
        BF.bindings([
          [ DF.variable('a'), DF.literal('a') ],
          [ DF.variable('b'), DF.literal('b') ],
        ]),
      ]);
      variables0 = [ DF.variable('a'), DF.variable('b') ];
      action.entries[1].output.bindingsStream = new ArrayIterator([
        BF.bindings([
          [ DF.variable('a'), DF.literal('a') ],
          [ DF.variable('c'), DF.literal('c') ],
        ]),
      ]);
      variables1 = [ DF.variable('a'), DF.variable('c') ];
      return actor.run(action).then(async(output: IQueryOperationResultBindings) => {
        expect((await output.metadata()).variables).toEqual([ DF.variable('a'), DF.variable('b'), DF.variable('c') ]);
        await expect(output.bindingsStream).toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('a'), DF.literal('a') ],
            [ DF.variable('b'), DF.literal('b') ],
            [ DF.variable('c'), DF.literal('c') ],
          ]),
        ]);
      });
    });

    it('should not join bindings with incompatible values', () => {
      action.entries[0].output.bindingsStream = new ArrayIterator([
        BF.bindings([
          [ DF.variable('a'), DF.literal('a') ],
          [ DF.variable('b'), DF.literal('b') ],
        ]),
      ]);
      variables0 = [ DF.variable('a'), DF.variable('b') ];
      action.entries[1].output.bindingsStream = new ArrayIterator([
        BF.bindings([
          [ DF.variable('a'), DF.literal('d') ],
          [ DF.variable('c'), DF.literal('c') ],
        ]),
      ]);
      variables1 = [ DF.variable('a'), DF.variable('c') ];
      return actor.run(action).then(async(output: IQueryOperationResultBindings) => {
        expect((await output.metadata()).variables).toEqual([ DF.variable('a'), DF.variable('b'), DF.variable('c') ]);
        await expect(output.bindingsStream).toEqualBindingsStream([]);
      });
    });

    it('should join multiple bindings', () => {
      action.entries[0].output.bindingsStream = new ArrayIterator([
        BF.bindings([
          [ DF.variable('a'), DF.literal('1') ],
          [ DF.variable('b'), DF.literal('2') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('1') ],
          [ DF.variable('b'), DF.literal('3') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('2') ],
          [ DF.variable('b'), DF.literal('2') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('2') ],
          [ DF.variable('b'), DF.literal('3') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('3') ],
          [ DF.variable('b'), DF.literal('3') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('3') ],
          [ DF.variable('b'), DF.literal('4') ],
        ]),
      ]);
      variables0 = [ DF.variable('a'), DF.variable('b') ];
      action.entries[1].output.bindingsStream = new ArrayIterator([
        BF.bindings([
          [ DF.variable('a'), DF.literal('1') ],
          [ DF.variable('c'), DF.literal('4') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('1') ],
          [ DF.variable('c'), DF.literal('5') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('2') ],
          [ DF.variable('c'), DF.literal('6') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('3') ],
          [ DF.variable('c'), DF.literal('7') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('0') ],
          [ DF.variable('c'), DF.literal('4') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('0') ],
          [ DF.variable('c'), DF.literal('4') ],
        ]),
      ]);
      variables1 = [ DF.variable('a'), DF.variable('c') ];
      return actor.run(action).then(async(output: IQueryOperationResultBindings) => {
        const expected = [
          BF.bindings([
            [ DF.variable('a'), DF.literal('1') ],
            [ DF.variable('b'), DF.literal('2') ],
            [ DF.variable('c'), DF.literal('4') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('1') ],
            [ DF.variable('b'), DF.literal('2') ],
            [ DF.variable('c'), DF.literal('5') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('1') ],
            [ DF.variable('b'), DF.literal('3') ],
            [ DF.variable('c'), DF.literal('4') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('1') ],
            [ DF.variable('b'), DF.literal('3') ],
            [ DF.variable('c'), DF.literal('5') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('2') ],
            [ DF.variable('b'), DF.literal('2') ],
            [ DF.variable('c'), DF.literal('6') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('2') ],
            [ DF.variable('b'), DF.literal('3') ],
            [ DF.variable('c'), DF.literal('6') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('3') ],
            [ DF.variable('b'), DF.literal('3') ],
            [ DF.variable('c'), DF.literal('7') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('3') ],
            [ DF.variable('b'), DF.literal('4') ],
            [ DF.variable('c'), DF.literal('7') ],
          ]),
        ];
        expect((await output.metadata()).variables).toEqual([ DF.variable('a'), DF.variable('b'), DF.variable('c') ]);
        // Mapping to string and sorting since we don't know order (well, we sort of know, but we might not!)
        // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
        expect((await arrayifyStream(output.bindingsStream)).map(bindingsToString).sort())
          // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
          .toEqual(expected.map(bindingsToString).sort());
      });
    });

    it('should join multiple bindings with undefs', () => {
      action.entries[0].output.bindingsStream = new ArrayIterator([
        BF.bindings([
          [ DF.variable('a'), DF.literal('1') ],
          [ DF.variable('b'), DF.literal('2') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('2') ],
          [ DF.variable('b'), DF.literal('3') ],
        ]),
      ]);
      variables0 = [ DF.variable('a'), DF.variable('b') ];
      action.entries[1].output.bindingsStream = new ArrayIterator([
        BF.bindings([
          [ DF.variable('a'), DF.literal('1') ],
          [ DF.variable('c'), DF.literal('4') ],
        ]),
        BF.bindings([
          [ DF.variable('c'), DF.literal('5') ],
        ]),
      ]);
      action.entries[1].output.metadata = async() => ({
        cardinality: { type: 'estimate', value: 5 },
        pageSize: 100,
        requestTime: 20,
        canContainUndefs: true,
        variables: variables1,
      });
      variables1 = [ DF.variable('a'), DF.variable('c') ];
      return actor.run(action).then(async(output: IQueryOperationResultBindings) => {
        const expected = [
          BF.bindings([
            [ DF.variable('a'), DF.literal('1') ],
            [ DF.variable('b'), DF.literal('2') ],
            [ DF.variable('c'), DF.literal('4') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('1') ],
            [ DF.variable('b'), DF.literal('2') ],
            [ DF.variable('c'), DF.literal('5') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('2') ],
            [ DF.variable('b'), DF.literal('3') ],
            [ DF.variable('c'), DF.literal('5') ],
          ]),
        ];
        expect((await output.metadata()).variables).toEqual([ DF.variable('a'), DF.variable('b'), DF.variable('c') ]);
        // Mapping to string and sorting since we don't know order (well, we sort of know, but we might not!)
        // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
        expect((await arrayifyStream(output.bindingsStream)).map(bindingsToString).sort())
          // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
          .toEqual(expected.map(bindingsToString).sort());
      });
    });
  });
});
