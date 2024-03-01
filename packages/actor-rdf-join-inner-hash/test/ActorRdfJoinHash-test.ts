import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { IActionRdfJoinSelectivity, IActorRdfJoinSelectivityOutput } from '@comunica/bus-rdf-join-selectivity';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import { ActionContext, Bus } from '@comunica/core';
import { MetadataValidationState } from '@comunica/metadata';
import type { IQueryOperationResultBindings, Bindings, IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorRdfJoinHash } from '../lib/ActorRdfJoinHash';
import '@comunica/jest';

const DF = new DataFactory();
const BF = new BindingsFactory();

function bindingsToString(b: Bindings): string {
  // eslint-disable-next-line ts/require-array-sort-compare
  const keys = [ ...b.keys() ].sort();
  return keys.map(k => `${k.value}:${b.get(k)!.value}`).toString();
}

describe('ActorRdfJoinHash', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('The ActorRdfJoinHash module', () => {
    it('should be a function', () => {
      expect(ActorRdfJoinHash).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfJoinHash constructor', () => {
      expect(new (<any> ActorRdfJoinHash)({ name: 'actor', bus })).toBeInstanceOf(ActorRdfJoinHash);
      expect(new (<any> ActorRdfJoinHash)({ name: 'actor', bus })).toBeInstanceOf(ActorRdfJoin);
    });

    it('should not be able to create new ActorRdfJoinHash objects without \'new\'', () => {
      expect(() => {
        (<any> ActorRdfJoinHash)();
      }).toThrow(`Class constructor ActorRdfJoinHash cannot be invoked without 'new'`);
    });
  });

  describe('An ActorRdfJoinHash instance', () => {
    let mediatorJoinSelectivity: Mediator<
    Actor<IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>,
    IActionRdfJoinSelectivity,
IActorTest,
IActorRdfJoinSelectivityOutput
>;
    let actor: ActorRdfJoinHash;
    let action: IActionRdfJoin;
    let variables0: RDF.Variable[];
    let variables1: RDF.Variable[];
    let iterators: ArrayIterator<Bindings>[];

    beforeEach(() => {
      mediatorJoinSelectivity = <any> {
        mediate: async() => ({ selectivity: 1 }),
      };
      actor = new ActorRdfJoinHash({ name: 'actor', bus, mediatorJoinSelectivity });
      variables0 = [];
      variables1 = [];
      iterators = [
        new ArrayIterator<Bindings>([], { autoStart: false }),
        new ArrayIterator<Bindings>([], { autoStart: false }),
      ];
      action = {
        type: 'inner',
        entries: [
          {
            output: {
              bindingsStream: iterators[0],
              metadata: () => Promise.resolve(
                {
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 4 },
                  pageSize: 100,
                  requestTime: 10,
                  canContainUndefs: false,
                  variables: variables0,
                },
              ),
              type: 'bindings',
            },
            operation: <any>{},
          },
          {
            output: {
              bindingsStream: iterators[1],
              metadata: () => Promise.resolve(
                {
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 5 },
                  pageSize: 100,
                  requestTime: 20,
                  canContainUndefs: false,
                  variables: variables1,
                },
              ),
              type: 'bindings',
            },
            operation: <any>{},
          },
        ],
        context,
      };
    });

    it('should only handle 2 streams', async() => {
      action.entries.push(<any> {});
      await expect(actor.test(action)).rejects.toBeTruthy();
      for (const iter of iterators) {
        iter.destroy();
      }
    });

    it('should fail on undefs in left stream', async() => {
      action = {
        type: 'inner',
        entries: [
          {
            output: {
              bindingsStream: iterators[0],
              metadata: () => Promise.resolve(
                {
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 4 },
                  pageSize: 100,
                  requestTime: 10,
                  canContainUndefs: true,
                  variables: [],
                },
              ),
              type: 'bindings',
            },
            operation: <any>{},
          },
          {
            output: {
              bindingsStream: iterators[1],
              metadata: () => Promise.resolve(
                {
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 5 },
                  pageSize: 100,
                  requestTime: 20,
                  canContainUndefs: false,
                  variables: [],
                },
              ),
              type: 'bindings',
            },
            operation: <any>{},
          },
        ],
        context,
      };
      await expect(actor.test(action)).rejects
        .toThrow(new Error('Actor actor can not join streams containing undefs'));

      for (const iter of iterators) {
        iter.destroy();
      }
    });

    it('should fail on undefs in right stream', async() => {
      action = {
        type: 'inner',
        entries: [
          {
            output: {
              bindingsStream: iterators[0],
              metadata: () => Promise.resolve(
                {
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 4 },
                  pageSize: 100,
                  requestTime: 10,
                  canContainUndefs: false,
                  variables: [],
                },
              ),
              type: 'bindings',
            },
            operation: <any>{},
          },
          {
            output: {
              bindingsStream: iterators[1],
              metadata: () => Promise.resolve({
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 5 },
                pageSize: 100,
                requestTime: 20,
                canContainUndefs: true,
                variables: [],
              }),
              type: 'bindings',
            },
            operation: <any>{},
          },
        ],
        context,
      };
      await expect(actor.test(action)).rejects
        .toThrow(new Error('Actor actor can not join streams containing undefs'));

      for (const iter of iterators) {
        iter.destroy();
      }
    });

    it('should fail on undefs in left and right stream', async() => {
      action = {
        type: 'inner',
        entries: [
          {
            output: {
              bindingsStream: iterators[0],
              metadata: () => Promise.resolve({
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 4 },
                pageSize: 100,
                requestTime: 10,
                canContainUndefs: true,
                variables: [],
              }),
              type: 'bindings',
            },
            operation: <any>{},
          },
          {
            output: {
              bindingsStream: iterators[1],
              metadata: () => Promise.resolve({
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 5 },
                pageSize: 100,
                requestTime: 20,
                canContainUndefs: true,
                variables: [],
              }),
              type: 'bindings',
            },
            operation: <any>{},
          },
        ],
        context,
      };
      await expect(actor.test(action)).rejects
        .toThrow(new Error('Actor actor can not join streams containing undefs'));

      for (const iter of iterators) {
        iter.destroy();
      }
    });

    it('should generate correct test metadata', async() => {
      await expect(actor.test(action)).resolves
        .toEqual({
          iterations: 9,
          persistedItems: 4,
          blockingItems: 4,
          requestTime: 1.4,
        });

      for (const iter of iterators) {
        iter.destroy();
      }
    });

    it('should generate correct metadata', async() => {
      await actor.run(action).then(async(result: IQueryOperationResultBindings) => {
        await expect((<any> result).metadata()).resolves.toHaveProperty('cardinality', {
          type: 'estimate',
          value: (await (<any> action.entries[0].output).metadata()).cardinality.value *
          (await (<any> action.entries[1].output).metadata()).cardinality.value,
        });

        await expect(result.bindingsStream.toArray()).resolves.toEqual([]);
      });
    });

    it('should return an empty stream for empty input', async() => {
      await actor.run(action).then(async(output: IQueryOperationResultBindings) => {
        await expect(output.metadata()).resolves
          .toEqual({
            state: expect.any(MetadataValidationState),
            cardinality: { type: 'estimate', value: 20 },
            canContainUndefs: false,
            variables: [],
          });
        await expect(output.bindingsStream).toEqualBindingsStream([]);
      });
    });

    it('should join bindings with matching values', async() => {
      // Close the iterators already declared since we will not be using them
      for (const iter of iterators) {
        iter.destroy();
      }

      action.entries[0].output.bindingsStream = new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('a'), DF.literal('a') ],
          [ DF.variable('b'), DF.literal('b') ],
        ]),
      ]);
      variables0 = [ DF.variable('a'), DF.variable('b') ];
      action.entries[1].output.bindingsStream = new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('a'), DF.literal('a') ],
          [ DF.variable('c'), DF.literal('c') ],
        ]),
      ]);
      variables1 = [ DF.variable('a'), DF.variable('c') ];
      await actor.run(action).then(async(output: IQueryOperationResultBindings) => {
        await expect(output.metadata()).resolves
          .toEqual({
            state: expect.any(MetadataValidationState),
            cardinality: { type: 'estimate', value: 20 },
            canContainUndefs: false,
            variables: [ DF.variable('a'), DF.variable('b'), DF.variable('c') ],
          });
        await expect(output.bindingsStream).toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('a'), DF.literal('a') ],
            [ DF.variable('b'), DF.literal('b') ],
            [ DF.variable('c'), DF.literal('c') ],
          ]),
        ]);
      });
    });

    it('should not join bindings with incompatible values', async() => {
      // Close the iterators already declared since we will not be using them
      for (const iter of iterators) {
        iter.destroy();
      }

      action.entries[0].output.bindingsStream = new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('a'), DF.literal('a') ],
          [ DF.variable('b'), DF.literal('b') ],
        ]),
      ]);
      variables0 = [ DF.variable('a'), DF.variable('b') ];
      action.entries[1].output.bindingsStream = new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('a'), DF.literal('d') ],
          [ DF.variable('c'), DF.literal('c') ],
        ]),
      ]);
      variables1 = [ DF.variable('a'), DF.variable('c') ];
      await actor.run(action).then(async(output: IQueryOperationResultBindings) => {
        await expect(output.metadata()).resolves.toEqual({
          state: expect.any(MetadataValidationState),
          canContainUndefs: false,
          cardinality: { type: 'estimate', value: 20 },
          variables: [ DF.variable('a'), DF.variable('b'), DF.variable('c') ],
        });
        await expect(output.bindingsStream).toEqualBindingsStream([]);
      });
    });

    it('should join multiple bindings', async() => {
      // Close the iterators already declared since we will not be using them
      for (const iter of iterators) {
        iter.destroy();
      }

      action.entries[0].output.bindingsStream = new ArrayIterator<RDF.Bindings>([
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
      action.entries[1].output.bindingsStream = new ArrayIterator<RDF.Bindings>([
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
      await actor.run(action).then(async(output: IQueryOperationResultBindings) => {
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
        await expect(output.metadata()).resolves.toEqual({
          state: expect.any(MetadataValidationState),
          canContainUndefs: false,
          cardinality: { type: 'estimate', value: 20 },
          variables: [ DF.variable('a'), DF.variable('b'), DF.variable('c') ],
        });
        // Mapping to string and sorting since we don't know order (well, we sort of know, but we might not!)
        expect((await arrayifyStream(output.bindingsStream)).map(bindingsToString).sort())
          .toEqual(expected.map(bindingsToString).sort());
      });
    });
  });
});
