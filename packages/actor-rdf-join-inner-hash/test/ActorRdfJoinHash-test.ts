import { Readable } from 'node:stream';
import type { MediatorHashBindings } from '@comunica/bus-hash-bindings';
import type { IActionRdfJoin, IActorRdfJoinTestSideData } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { IActionRdfJoinSelectivity, IActorRdfJoinSelectivityOutput } from '@comunica/bus-rdf-join-selectivity';
import { KeysInitQuery } from '@comunica/context-entries';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import { ActionContext, Bus } from '@comunica/core';
import type { IQueryOperationResultBindings, Bindings, IActionContext, MetadataVariable } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorRdfJoinHash } from '../lib/ActorRdfJoinHash';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

function bindingsToString(b: Bindings): string {
  const keys = [ ...b.keys() ].sort((k1, k2) => k1.value.localeCompare(k2.value));
  return keys.map(k => `${k.value}:${b.get(k)!.value}`).toString();
}

describe('ActorRdfJoinHash', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
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

  describe('An ActorRdfJoinHash instance with canHandleUndefs false', () => {
    let mediatorJoinSelectivity: Mediator<
    Actor<IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>,
    IActionRdfJoinSelectivity,
IActorTest,
IActorRdfJoinSelectivityOutput
>;
    let mediatorHashBindings: MediatorHashBindings;
    let actor: ActorRdfJoinHash;
    let action: IActionRdfJoin;
    let variables0: MetadataVariable[];
    let variables1: MetadataVariable[];
    let iterators: ArrayIterator<Bindings>[];

    beforeEach(() => {
      mediatorJoinSelectivity = <any> {
        mediate: async() => ({ selectivity: 1 }),
      };
      mediatorHashBindings = <any> {
        mediate: async() => ({
          hashFunction: (bindings: RDF.Bindings, variables: RDF.Variable[]) => bindingsToString(bindings
            .filter((value, key) => variables.some(variable => variable.equals(key)))),
        }),
      };
      actor = new ActorRdfJoinHash({
        name: 'actor',
        bus,
        mediatorJoinSelectivity,
        canHandleUndefs: false,
        mediatorHashBindings,
      });
      variables0 = [
        { variable: DF.variable('a'), canBeUndef: false },
      ];
      variables1 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('b'), canBeUndef: false },
      ];
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

    async function getSideData(action: IActionRdfJoin): Promise<IActorRdfJoinTestSideData> {
      return (await actor.test(action)).getSideData();
    }

    it('should only handle 2 streams', async() => {
      action.entries.push(<any> {});
      await expect(actor.test(action)).resolves.toFailTest(`actor requires 2 join entries at most. The input contained 3.`);
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
                  variables: [
                    { variable: DF.variable('a'), canBeUndef: true },
                  ],
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

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: true },
                  ],
                },
              ),
              type: 'bindings',
            },
            operation: <any>{},
          },
        ],
        context,
      };
      await expect(actor.test(action)).resolves
        .toFailTest('Actor actor can not join streams containing undefs');

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

                  variables: [{ variable: DF.variable('a'), canBeUndef: false }],
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
                variables: [{ variable: DF.variable('a'), canBeUndef: true }],
              }),
              type: 'bindings',
            },
            operation: <any>{},
          },
        ],
        context,
      };
      await expect(actor.test(action)).resolves
        .toFailTest('Actor actor can not join streams containing undefs');

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
                variables: [{ variable: DF.variable('a'), canBeUndef: true }],
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
                variables: [{ variable: DF.variable('a'), canBeUndef: true }],
              }),
              type: 'bindings',
            },
            operation: <any>{},
          },
        ],
        context,
      };
      await expect(actor.test(action)).resolves
        .toFailTest('Actor actor can not join streams containing undefs');

      for (const iter of iterators) {
        iter.destroy();
      }
    });

    it('should fail on non-overlapping variables', async() => {
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

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
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

                variables: [
                  { variable: DF.variable('b'), canBeUndef: false },
                ],
              }),
              type: 'bindings',
            },
            operation: <any>{},
          },
        ],
        context,
      };
      await expect(actor.test(action)).resolves
        .toFailTest('Actor actor can only join entries with at least one common variable');

      for (const iter of iterators) {
        iter.destroy();
      }
    });

    it('should generate correct test metadata', async() => {
      await expect(actor.test(action)).resolves
        .toPassTest({
          iterations: 7.2,
          persistedItems: 4,
          blockingItems: 4,
          requestTime: 1.4,
        });

      for (const iter of iterators) {
        iter.destroy();
      }
    });

    it('should generate correct test metadata when right is smaller than left', async() => {
      // Close the iterators already declared since we will not be using them
      for (const iter of iterators) {
        iter.destroy();
      }
      action = {
        type: 'inner',
        entries: [
          {
            output: {
              bindingsStream: new ArrayIterator<RDF.Bindings>([
                BF.bindings([
                  [ DF.variable('a'), DF.literal('a') ],
                  [ DF.variable('b'), DF.literal('b') ],
                ]),
              ], { autoStart: false }),
              metadata: () => Promise.resolve(
                {
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 5 },
                  pageSize: 100,
                  requestTime: 10,

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                    { variable: DF.variable('b'), canBeUndef: false },
                  ],
                },
              ),
              type: 'bindings',
            },
            operation: <any>{},
          },
          {
            output: {
              bindingsStream: new ArrayIterator<RDF.Bindings>([
                BF.bindings([
                  [ DF.variable('a'), DF.literal('a') ],
                  [ DF.variable('c'), DF.literal('c') ],
                ]),
              ], { autoStart: false }),
              metadata: () => Promise.resolve(
                {
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 4 },
                  pageSize: 100,
                  requestTime: 20,

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                    { variable: DF.variable('c'), canBeUndef: false },
                  ],
                },
              ),
              type: 'bindings',
            },
            operation: <any>{},
          },
        ],
        context,
      };

      await expect(actor.test(action)).resolves
        .toPassTest({
          iterations: 7.2,
          persistedItems: 4,
          blockingItems: 4,
          requestTime: 1.3,
        });

      for (const iter of iterators) {
        iter.destroy();
      }
    });

    it('should generate correct metadata', async() => {
      await actor.run(action, await getSideData(action)).then(async(result: IQueryOperationResultBindings) => {
        await expect((<any> result).metadata()).resolves.toHaveProperty('cardinality', {
          type: 'estimate',
          value: (await (<any> action.entries[0].output).metadata()).cardinality.value *
          (await (<any> action.entries[1].output).metadata()).cardinality.value,
        });

        await expect(result.bindingsStream.toArray()).resolves.toEqual([]);
      });
    });

    it('should return an empty stream for empty input', async() => {
      await actor.run(action, await getSideData(action)).then(async(output: IQueryOperationResultBindings) => {
        await expect(output.metadata()).resolves
          .toEqual({
            state: expect.any(MetadataValidationState),
            cardinality: { type: 'estimate', value: 20 },

            variables: [
              { variable: DF.variable('a'), canBeUndef: false },
              { variable: DF.variable('b'), canBeUndef: false },
            ],
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
      ], { autoStart: false });
      variables0 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('b'), canBeUndef: false },
      ];
      action.entries[1].output.bindingsStream = new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('a'), DF.literal('a') ],
          [ DF.variable('c'), DF.literal('c') ],
        ]),
      ], { autoStart: false });
      variables1 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('c'), canBeUndef: false },
      ];
      await actor.run(action, await getSideData(action)).then(async(output: IQueryOperationResultBindings) => {
        await expect(output.metadata()).resolves
          .toEqual({
            state: expect.any(MetadataValidationState),
            cardinality: { type: 'estimate', value: 20 },

            variables: [
              { variable: DF.variable('a'), canBeUndef: false },
              { variable: DF.variable('b'), canBeUndef: false },
              { variable: DF.variable('c'), canBeUndef: false },
            ],
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
      variables0 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('b'), canBeUndef: false },
      ];
      action.entries[1].output.bindingsStream = new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('a'), DF.literal('d') ],
          [ DF.variable('c'), DF.literal('c') ],
        ]),
      ]);
      variables1 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('c'), canBeUndef: false },
      ];
      await actor.run(action, await getSideData(action)).then(async(output: IQueryOperationResultBindings) => {
        await expect(output.metadata()).resolves.toEqual({
          state: expect.any(MetadataValidationState),

          cardinality: { type: 'estimate', value: 20 },
          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
            { variable: DF.variable('b'), canBeUndef: false },
            { variable: DF.variable('c'), canBeUndef: false },
          ],
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
      ], { autoStart: false });
      variables0 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('b'), canBeUndef: false },
      ];
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
      ], { autoStart: false });
      variables1 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('c'), canBeUndef: false },
      ];
      await actor.run(action, await getSideData(action)).then(async(output: IQueryOperationResultBindings) => {
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

          cardinality: { type: 'estimate', value: 20 },
          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
            { variable: DF.variable('b'), canBeUndef: false },
            { variable: DF.variable('c'), canBeUndef: false },
          ],
        });
        // Mapping to string and sorting since we don't know order (well, we sort of know, but we might not!)
        expect((await arrayifyStream(output.bindingsStream)).map(bindingsToString).sort())
          .toEqual(expected.map(bindingsToString).sort());
      });
    });

    it('should flip when right is smaller than left', async() => {
      // Close the iterators already declared since we will not be using them
      for (const iter of iterators) {
        iter.destroy();
      }

      action = {
        type: 'inner',
        entries: [
          {
            output: {
              bindingsStream: new ArrayIterator<RDF.Bindings>([
                BF.bindings([
                  [ DF.variable('a'), DF.literal('a') ],
                  [ DF.variable('b'), DF.literal('b') ],
                ]),
              ], { autoStart: false }),
              metadata: () => Promise.resolve(
                {
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 5 },
                  pageSize: 100,
                  requestTime: 10,

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                    { variable: DF.variable('b'), canBeUndef: false },
                  ],
                },
              ),
              type: 'bindings',
            },
            operation: <any>{},
          },
          {
            output: {
              bindingsStream: new ArrayIterator<RDF.Bindings>([
                BF.bindings([
                  [ DF.variable('a'), DF.literal('a') ],
                  [ DF.variable('c'), DF.literal('c') ],
                ]),
              ], { autoStart: false }),
              metadata: () => Promise.resolve(
                {
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 4 },
                  pageSize: 100,
                  requestTime: 20,

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                    { variable: DF.variable('c'), canBeUndef: false },
                  ],
                },
              ),
              type: 'bindings',
            },
            operation: <any>{},
          },
        ],
        context,
      };

      await actor.run(action, await getSideData(action)).then(async(output: IQueryOperationResultBindings) => {
        await expect(output.metadata()).resolves
          .toEqual({
            state: expect.any(MetadataValidationState),
            cardinality: { type: 'estimate', value: 20 },

            variables: [
              { variable: DF.variable('a'), canBeUndef: false },
              { variable: DF.variable('c'), canBeUndef: false },
              { variable: DF.variable('b'), canBeUndef: false },
            ],
          });
        await expect(output.bindingsStream).toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('a'), DF.literal('a') ],
            [ DF.variable('c'), DF.literal('c') ],
            [ DF.variable('b'), DF.literal('b') ],
          ]),
        ]);
      });
    });

    it('propagates errors in the left stream', async() => {
      // Close the iterators already declared since we will not be using them
      for (const iter of iterators) {
        iter.destroy();
      }

      const readable = new Readable();
      readable._read = () => {
        readable.emit('error', new Error('Error'));
      };
      action.entries[0].output.bindingsStream = <any> readable;
      variables0 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('b'), canBeUndef: false },
      ];
      action.entries[1].output.bindingsStream = new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('a'), DF.literal('1') ],
          [ DF.variable('c'), DF.literal('4') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('2') ],
          [ DF.variable('c'), DF.literal('5') ],
        ]),
      ], { autoStart: false });
      variables1 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('c'), canBeUndef: false },
      ];
      await actor.run(action, await getSideData(action)).then(async(output: IQueryOperationResultBindings) => {
        await expect(arrayifyStream(output.bindingsStream)).rejects.toThrow('Error');
      });
    });

    it('propagates errors in the right stream', async() => {
      // Close the iterators already declared since we will not be using them
      for (const iter of iterators) {
        iter.destroy();
      }

      const readable = new Readable();
      readable._read = () => {
        readable.emit('error', new Error('Error'));
      };
      action.entries[0].output.bindingsStream = new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('a'), DF.literal('1') ],
          [ DF.variable('c'), DF.literal('4') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('2') ],
          [ DF.variable('c'), DF.literal('5') ],
        ]),
      ], { autoStart: false });
      variables0 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('b'), canBeUndef: false },
      ];
      action.entries[1].output.bindingsStream = <any> readable;
      variables1 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('c'), canBeUndef: false },
      ];
      await actor.run(action, await getSideData(action)).then(async(output: IQueryOperationResultBindings) => {
        await expect(arrayifyStream(output.bindingsStream)).rejects.toThrow('Error');
      });
    });
  });

  describe('An ActorRdfJoinHash instance with canHandleUndefs true', () => {
    let mediatorJoinSelectivity: Mediator<
      Actor<IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>,
      IActionRdfJoinSelectivity,
      IActorTest,
      IActorRdfJoinSelectivityOutput
    >;
    let mediatorHashBindings: MediatorHashBindings;
    let actor: ActorRdfJoinHash;
    let action: IActionRdfJoin;
    let variables0: MetadataVariable[];
    let variables1: MetadataVariable[];
    let variables0Undef: MetadataVariable[];
    let variables1Undef: MetadataVariable[];
    let iterators: ArrayIterator<Bindings>[];

    beforeEach(() => {
      mediatorJoinSelectivity = <any> {
        mediate: async() => ({ selectivity: 1 }),
      };
      mediatorHashBindings = <any> {
        mediate: async() => ({
          hashFunction: (bindings: RDF.Bindings, variables: RDF.Variable[]) => bindingsToString(bindings
            .filter((value, key) => variables.some(variable => variable.equals(key)))),
        }),
      };
      actor = new ActorRdfJoinHash({
        name: 'actor',
        bus,
        mediatorJoinSelectivity,
        canHandleUndefs: true,
        mediatorHashBindings,
      });
      variables0 = [
        { variable: DF.variable('a'), canBeUndef: false },
      ];
      variables1 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('b'), canBeUndef: false },
      ];
      variables0Undef = [
        { variable: DF.variable('a'), canBeUndef: true },
      ];
      variables1Undef = [
        { variable: DF.variable('a'), canBeUndef: true },
        { variable: DF.variable('b'), canBeUndef: false },
      ];
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
      await expect(actor.test(action)).resolves.toFailTest(`actor requires 2 join entries at most. The input contained 3.`);
      for (const iter of iterators) {
        iter.destroy();
      }
    });

    it('should pass on undefs in left stream', async() => {
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
                  variables: variables0Undef,
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
      await expect(actor.test(action)).resolves
        .toPassTest({
          iterations: 9,
          persistedItems: 4,
          blockingItems: 4,
          requestTime: 1.4,
        });

      for (const iter of iterators) {
        iter.destroy();
      }
    });

    it('should pass on undefs in right stream', async() => {
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
              metadata: () => Promise.resolve({
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 5 },
                pageSize: 100,
                requestTime: 20,
                variables: variables1Undef,
              }),
              type: 'bindings',
            },
            operation: <any>{},
          },
        ],
        context,
      };
      await expect(actor.test(action)).resolves
        .toPassTest({
          iterations: 9,
          persistedItems: 4,
          blockingItems: 4,
          requestTime: 1.4,
        });

      for (const iter of iterators) {
        iter.destroy();
      }
    });

    it('should pass on undefs in left and right stream', async() => {
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
                variables: variables0Undef,
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
                variables: variables1Undef,
              }),
              type: 'bindings',
            },
            operation: <any>{},
          },
        ],
        context,
      };
      await expect(actor.test(action)).resolves
        .toPassTest({
          iterations: 9,
          persistedItems: 4,
          blockingItems: 4,
          requestTime: 1.4,
        });

      for (const iter of iterators) {
        iter.destroy();
      }
    });

    it('should fail on non-overlapping variables', async() => {
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

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
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

                variables: [
                  { variable: DF.variable('b'), canBeUndef: false },
                ],
              }),
              type: 'bindings',
            },
            operation: <any>{},
          },
        ],
        context,
      };
      await expect(actor.test(action)).resolves
        .toFailTest('Actor actor can only join entries with at least one common variable');

      for (const iter of iterators) {
        iter.destroy();
      }
    });

    it('should generate correct test metadata', async() => {
      await expect(actor.test(action)).resolves
        .toPassTest({
          iterations: 9,
          persistedItems: 4,
          blockingItems: 4,
          requestTime: 1.4,
        });

      for (const iter of iterators) {
        iter.destroy();
      }
    });

    it('should generate correct test metadata when right is smaller than left', async() => {
      // Close the iterators already declared since we will not be using them
      for (const iter of iterators) {
        iter.destroy();
      }
      action = {
        type: 'inner',
        entries: [
          {
            output: {
              bindingsStream: new ArrayIterator<RDF.Bindings>([
                BF.bindings([
                  [ DF.variable('a'), DF.literal('a') ],
                  [ DF.variable('b'), DF.literal('b') ],
                ]),
              ], { autoStart: false }),
              metadata: () => Promise.resolve(
                {
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 5 },
                  pageSize: 100,
                  requestTime: 10,

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                    { variable: DF.variable('b'), canBeUndef: false },
                  ],
                },
              ),
              type: 'bindings',
            },
            operation: <any>{},
          },
          {
            output: {
              bindingsStream: new ArrayIterator<RDF.Bindings>([
                BF.bindings([
                  [ DF.variable('a'), DF.literal('a') ],
                  [ DF.variable('c'), DF.literal('c') ],
                ]),
              ], { autoStart: false }),
              metadata: () => Promise.resolve(
                {
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 4 },
                  pageSize: 100,
                  requestTime: 20,

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                    { variable: DF.variable('c'), canBeUndef: false },
                  ],
                },
              ),
              type: 'bindings',
            },
            operation: <any>{},
          },
        ],
        context,
      };

      await expect(actor.test(action)).resolves
        .toPassTest({
          iterations: 9,
          persistedItems: 4,
          blockingItems: 4,
          requestTime: 1.3,
        });

      for (const iter of iterators) {
        iter.destroy();
      }
    });

    async function getSideData(action: IActionRdfJoin): Promise<IActorRdfJoinTestSideData> {
      return (await actor.test(action)).getSideData();
    }

    it('should generate correct metadata', async() => {
      await actor.run(action, await getSideData(action)).then(async(result: IQueryOperationResultBindings) => {
        await expect((<any> result).metadata()).resolves.toHaveProperty('cardinality', {
          type: 'estimate',
          value: (await (<any> action.entries[0].output).metadata()).cardinality.value *
            (await (<any> action.entries[1].output).metadata()).cardinality.value,
        });

        await expect(result.bindingsStream.toArray()).resolves.toEqual([]);
      });
    });

    it('should return an empty stream for empty input', async() => {
      await actor.run(action, await getSideData(action)).then(async(output: IQueryOperationResultBindings) => {
        await expect(output.metadata()).resolves
          .toEqual({
            state: expect.any(MetadataValidationState),
            cardinality: { type: 'estimate', value: 20 },
            variables: [
              { variable: DF.variable('a'), canBeUndef: false },
              { variable: DF.variable('b'), canBeUndef: false },
            ],
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
      ], { autoStart: false });
      variables0 = [
        { variable: DF.variable('a'), canBeUndef: true },
        { variable: DF.variable('b'), canBeUndef: false },
      ];
      action.entries[1].output.bindingsStream = new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('a'), DF.literal('a') ],
          [ DF.variable('c'), DF.literal('c') ],
        ]),
      ], { autoStart: false });
      variables1 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('c'), canBeUndef: true },
      ];
      await actor.run(action, await getSideData(action)).then(async(output: IQueryOperationResultBindings) => {
        await expect(output.metadata()).resolves
          .toEqual({
            state: expect.any(MetadataValidationState),
            cardinality: { type: 'estimate', value: 20 },
            variables: [
              { variable: DF.variable('a'), canBeUndef: true },
              { variable: DF.variable('b'), canBeUndef: false },
              { variable: DF.variable('c'), canBeUndef: true },
            ],
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
      variables0 = [
        { variable: DF.variable('a'), canBeUndef: true },
        { variable: DF.variable('b'), canBeUndef: false },
      ];
      action.entries[1].output.bindingsStream = new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('a'), DF.literal('d') ],
          [ DF.variable('c'), DF.literal('c') ],
        ]),
      ]);
      variables1 = [
        { variable: DF.variable('a'), canBeUndef: true },
        { variable: DF.variable('c'), canBeUndef: false },
      ];
      await actor.run(action, await getSideData(action)).then(async(output: IQueryOperationResultBindings) => {
        await expect(output.metadata()).resolves.toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: 20 },
          variables: [
            { variable: DF.variable('a'), canBeUndef: true },
            { variable: DF.variable('b'), canBeUndef: false },
            { variable: DF.variable('c'), canBeUndef: false },
          ],
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
      ], { autoStart: false });
      variables0 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('b'), canBeUndef: false },
      ];
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
      ], { autoStart: false });
      variables1 = [
        { variable: DF.variable('a'), canBeUndef: true },
        { variable: DF.variable('c'), canBeUndef: false },
      ];
      await actor.run(action, await getSideData(action)).then(async(output: IQueryOperationResultBindings) => {
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
          cardinality: { type: 'estimate', value: 20 },
          variables: [
            { variable: DF.variable('a'), canBeUndef: true },
            { variable: DF.variable('b'), canBeUndef: false },
            { variable: DF.variable('c'), canBeUndef: false },
          ],
        });
        // Mapping to string and sorting since we don't know order (well, we sort of know, but we might not!)
        expect((await arrayifyStream(output.bindingsStream)).map(bindingsToString).sort())
          .toEqual(expected.map(bindingsToString).sort());
      });
    });

    it('should flip when right is smaller than left', async() => {
      // Close the iterators already declared since we will not be using them
      for (const iter of iterators) {
        iter.destroy();
      }

      action = {
        type: 'inner',
        entries: [
          {
            output: {
              bindingsStream: new ArrayIterator<RDF.Bindings>([
                BF.bindings([
                  [ DF.variable('a'), DF.literal('a') ],
                  [ DF.variable('b'), DF.literal('b') ],
                ]),
              ], { autoStart: false }),
              metadata: () => Promise.resolve(
                {
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 5 },
                  pageSize: 100,
                  requestTime: 10,

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                    { variable: DF.variable('b'), canBeUndef: false },
                  ],
                },
              ),
              type: 'bindings',
            },
            operation: <any>{},
          },
          {
            output: {
              bindingsStream: new ArrayIterator<RDF.Bindings>([
                BF.bindings([
                  [ DF.variable('a'), DF.literal('a') ],
                  [ DF.variable('c'), DF.literal('c') ],
                ]),
              ], { autoStart: false }),
              metadata: () => Promise.resolve(
                {
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 4 },
                  pageSize: 100,
                  requestTime: 20,

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                    { variable: DF.variable('c'), canBeUndef: false },
                  ],
                },
              ),
              type: 'bindings',
            },
            operation: <any>{},
          },
        ],
        context,
      };

      await actor.run(action, await getSideData(action)).then(async(output: IQueryOperationResultBindings) => {
        await expect(output.metadata()).resolves
          .toEqual({
            state: expect.any(MetadataValidationState),
            cardinality: { type: 'estimate', value: 20 },

            variables: [
              { variable: DF.variable('a'), canBeUndef: false },
              { variable: DF.variable('c'), canBeUndef: false },
              { variable: DF.variable('b'), canBeUndef: false },
            ],
          });
        await expect(output.bindingsStream).toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('a'), DF.literal('a') ],
            [ DF.variable('c'), DF.literal('c') ],
            [ DF.variable('b'), DF.literal('b') ],
          ]),
        ]);
      });
    });

    it('should handle a small set of bindings', async() => {
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
          [ DF.variable('a'), DF.literal('2') ],
          [ DF.variable('b'), DF.literal('3') ],
        ]),
      ], { autoStart: false });
      variables0 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('b'), canBeUndef: false },
      ];
      action.entries[1].output.bindingsStream = new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('a'), DF.literal('1') ],
          [ DF.variable('c'), DF.literal('4') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('2') ],
          [ DF.variable('c'), DF.literal('5') ],
        ]),
      ], { autoStart: false });
      variables1 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('c'), canBeUndef: false },
      ];
      await actor.run(action, await getSideData(action)).then(async(output: IQueryOperationResultBindings) => {
        const expected = [
          BF.bindings([
            [ DF.variable('a'), DF.literal('1') ],
            [ DF.variable('b'), DF.literal('2') ],
            [ DF.variable('c'), DF.literal('4') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('2') ],
            [ DF.variable('b'), DF.literal('3') ],
            [ DF.variable('c'), DF.literal('5') ],
          ]),
        ];
        await expect(output.metadata()).resolves.toEqual({
          state: expect.any(MetadataValidationState),

          cardinality: { type: 'estimate', value: 20 },
          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
            { variable: DF.variable('b'), canBeUndef: false },
            { variable: DF.variable('c'), canBeUndef: false },
          ],
        });
        // Mapping to string and sorting since we don't know order (well, we sort of know, but we might not!)
        expect((await arrayifyStream(output.bindingsStream)).map(bindingsToString).sort())
          .toEqual(expected.map(bindingsToString).sort());
      });
    });

    it('should handle undef in right', async() => {
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
          [ DF.variable('a'), DF.literal('2') ],
          [ DF.variable('b'), DF.literal('3') ],
        ]),
      ], { autoStart: false });
      variables0 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('b'), canBeUndef: false },
      ];
      action.entries[1].output.bindingsStream = new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('a'), DF.literal('1') ],
          [ DF.variable('c'), DF.literal('4') ],
        ]),
        BF.bindings([
          [ DF.variable('c'), DF.literal('5') ],
        ]),
      ], { autoStart: false });
      variables1 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('c'), canBeUndef: false },
      ];
      await actor.run(action, await getSideData(action)).then(async(output: IQueryOperationResultBindings) => {
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
        await expect(output.metadata()).resolves.toEqual({
          state: expect.any(MetadataValidationState),

          cardinality: { type: 'estimate', value: 20 },
          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
            { variable: DF.variable('b'), canBeUndef: false },
            { variable: DF.variable('c'), canBeUndef: false },
          ],
        });
        // Mapping to string and sorting since we don't know order (well, we sort of know, but we might not!)
        expect((await arrayifyStream(output.bindingsStream)).map(bindingsToString).sort())
          .toEqual(expected.map(bindingsToString).sort());
      });
    });

    it('should handle undef in left (small)', async() => {
      // Close the iterators already declared since we will not be using them
      for (const iter of iterators) {
        iter.destroy();
      }

      action.entries[0].output.bindingsStream = new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('b'), DF.literal('3') ],
        ]),
      ], { autoStart: false });
      variables0 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('b'), canBeUndef: false },
      ];
      action.entries[1].output.bindingsStream = new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('a'), DF.literal('2') ],
          [ DF.variable('c'), DF.literal('5') ],
        ]),
      ], { autoStart: false });
      variables1 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('c'), canBeUndef: false },
      ];
      await actor.run(action, await getSideData(action)).then(async(output: IQueryOperationResultBindings) => {
        const expected = [
          BF.bindings([
            [ DF.variable('a'), DF.literal('2') ],
            [ DF.variable('b'), DF.literal('3') ],
            [ DF.variable('c'), DF.literal('5') ],
          ]),
        ];
        await expect(output.metadata()).resolves.toEqual({
          state: expect.any(MetadataValidationState),

          cardinality: { type: 'estimate', value: 20 },
          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
            { variable: DF.variable('b'), canBeUndef: false },
            { variable: DF.variable('c'), canBeUndef: false },
          ],
        });
        // Mapping to string and sorting since we don't know order (well, we sort of know, but we might not!)
        expect((await arrayifyStream(output.bindingsStream)).map(bindingsToString).sort())
          .toEqual(expected.map(bindingsToString).sort());
      });
    });

    it('should handle undef in left', async() => {
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
          [ DF.variable('b'), DF.literal('3') ],
        ]),
      ], { autoStart: false });
      variables0 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('b'), canBeUndef: false },
      ];
      action.entries[1].output.bindingsStream = new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('a'), DF.literal('1') ],
          [ DF.variable('c'), DF.literal('4') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('2') ],
          [ DF.variable('c'), DF.literal('5') ],
        ]),
      ], { autoStart: false });
      variables1 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('c'), canBeUndef: false },
      ];
      await actor.run(action, await getSideData(action)).then(async(output: IQueryOperationResultBindings) => {
        const expected = [
          BF.bindings([
            [ DF.variable('a'), DF.literal('1') ],
            [ DF.variable('b'), DF.literal('2') ],
            [ DF.variable('c'), DF.literal('4') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('1') ],
            [ DF.variable('b'), DF.literal('3') ],
            [ DF.variable('c'), DF.literal('4') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('2') ],
            [ DF.variable('b'), DF.literal('3') ],
            [ DF.variable('c'), DF.literal('5') ],
          ]),
        ];
        await expect(output.metadata()).resolves.toEqual({
          state: expect.any(MetadataValidationState),

          cardinality: { type: 'estimate', value: 20 },
          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
            { variable: DF.variable('b'), canBeUndef: false },
            { variable: DF.variable('c'), canBeUndef: false },
          ],
        });
        // Mapping to string and sorting since we don't know order (well, we sort of know, but we might not!)
        expect((await arrayifyStream(output.bindingsStream)).map(bindingsToString).sort())
          .toEqual(expected.map(bindingsToString).sort());
      });
    });

    it('should handle undef in left and right (small)', async() => {
      // Close the iterators already declared since we will not be using them
      for (const iter of iterators) {
        iter.destroy();
      }

      action.entries[0].output.bindingsStream = new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('b'), DF.literal('3') ],
        ]),
      ], { autoStart: false });
      variables0 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('b'), canBeUndef: false },
      ];
      action.entries[1].output.bindingsStream = new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('c'), DF.literal('5') ],
        ]),
      ], { autoStart: false });
      variables1 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('c'), canBeUndef: false },
      ];
      await actor.run(action, await getSideData(action)).then(async(output: IQueryOperationResultBindings) => {
        const expected = [
          BF.bindings([
            [ DF.variable('b'), DF.literal('3') ],
            [ DF.variable('c'), DF.literal('5') ],
          ]),
        ];
        await expect(output.metadata()).resolves.toEqual({
          state: expect.any(MetadataValidationState),

          cardinality: { type: 'estimate', value: 20 },
          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
            { variable: DF.variable('b'), canBeUndef: false },
            { variable: DF.variable('c'), canBeUndef: false },
          ],
        });
        // Mapping to string and sorting since we don't know order (well, we sort of know, but we might not!)
        expect((await arrayifyStream(output.bindingsStream)).map(bindingsToString).sort())
          .toEqual(expected.map(bindingsToString).sort());
      });
    });

    it('should handle undef in left and right (small 2)', async() => {
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
          [ DF.variable('b'), DF.literal('3') ],
        ]),
      ], { autoStart: false });
      variables0 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('b'), canBeUndef: false },
      ];
      action.entries[1].output.bindingsStream = new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('c'), DF.literal('5') ],
        ]),
      ], { autoStart: false });
      variables1 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('c'), canBeUndef: false },
      ];
      await actor.run(action, await getSideData(action)).then(async(output: IQueryOperationResultBindings) => {
        const expected = [
          BF.bindings([
            [ DF.variable('a'), DF.literal('1') ],
            [ DF.variable('b'), DF.literal('2') ],
            [ DF.variable('c'), DF.literal('5') ],
          ]),
          BF.bindings([
            [ DF.variable('b'), DF.literal('3') ],
            [ DF.variable('c'), DF.literal('5') ],
          ]),
        ];
        await expect(output.metadata()).resolves.toEqual({
          state: expect.any(MetadataValidationState),

          cardinality: { type: 'estimate', value: 20 },
          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
            { variable: DF.variable('b'), canBeUndef: false },
            { variable: DF.variable('c'), canBeUndef: false },
          ],
        });
        // Mapping to string and sorting since we don't know order (well, we sort of know, but we might not!)
        expect((await arrayifyStream(output.bindingsStream)).map(bindingsToString).sort())
          .toEqual(expected.map(bindingsToString).sort());
      });
    });

    it('should handle undef in left and right (small 3)', async() => {
      // Close the iterators already declared since we will not be using them
      for (const iter of iterators) {
        iter.destroy();
      }

      action.entries[0].output.bindingsStream = new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('b'), DF.literal('3') ],
        ]),
      ], { autoStart: false });
      variables0 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('b'), canBeUndef: false },
      ];
      action.entries[1].output.bindingsStream = new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('a'), DF.literal('1') ],
          [ DF.variable('c'), DF.literal('4') ],
        ]),
        BF.bindings([
          [ DF.variable('c'), DF.literal('5') ],
        ]),
      ], { autoStart: false });
      variables1 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('c'), canBeUndef: false },
      ];
      await actor.run(action, await getSideData(action)).then(async(output: IQueryOperationResultBindings) => {
        const expected = [
          BF.bindings([
            [ DF.variable('a'), DF.literal('1') ],
            [ DF.variable('b'), DF.literal('3') ],
            [ DF.variable('c'), DF.literal('4') ],
          ]),
          BF.bindings([
            [ DF.variable('b'), DF.literal('3') ],
            [ DF.variable('c'), DF.literal('5') ],
          ]),
        ];
        await expect(output.metadata()).resolves.toEqual({
          state: expect.any(MetadataValidationState),

          cardinality: { type: 'estimate', value: 20 },
          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
            { variable: DF.variable('b'), canBeUndef: false },
            { variable: DF.variable('c'), canBeUndef: false },
          ],
        });
        // Mapping to string and sorting since we don't know order (well, we sort of know, but we might not!)
        expect((await arrayifyStream(output.bindingsStream)).map(bindingsToString).sort())
          .toEqual(expected.map(bindingsToString).sort());
      });
    });

    it('should handle undef in left and right', async() => {
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
          [ DF.variable('b'), DF.literal('3') ],
        ]),
      ], { autoStart: false });
      variables0 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('b'), canBeUndef: false },
      ];
      action.entries[1].output.bindingsStream = new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('a'), DF.literal('1') ],
          [ DF.variable('c'), DF.literal('4') ],
        ]),
        BF.bindings([
          [ DF.variable('c'), DF.literal('5') ],
        ]),
      ], { autoStart: false });
      variables1 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('c'), canBeUndef: false },
      ];
      await actor.run(action, await getSideData(action)).then(async(output: IQueryOperationResultBindings) => {
        const expected = [
          BF.bindings([
            [ DF.variable('a'), DF.literal('1') ],
            [ DF.variable('b'), DF.literal('2') ],
            [ DF.variable('c'), DF.literal('4') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('1') ],
            [ DF.variable('b'), DF.literal('3') ],
            [ DF.variable('c'), DF.literal('4') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('1') ],
            [ DF.variable('b'), DF.literal('2') ],
            [ DF.variable('c'), DF.literal('5') ],
          ]),
          BF.bindings([
            [ DF.variable('b'), DF.literal('3') ],
            [ DF.variable('c'), DF.literal('5') ],
          ]),
        ];
        await expect(output.metadata()).resolves.toEqual({
          state: expect.any(MetadataValidationState),

          cardinality: { type: 'estimate', value: 20 },
          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
            { variable: DF.variable('b'), canBeUndef: false },
            { variable: DF.variable('c'), canBeUndef: false },
          ],
        });
        // Mapping to string and sorting since we don't know order (well, we sort of know, but we might not!)
        expect((await arrayifyStream(output.bindingsStream)).map(bindingsToString).sort())
          .toEqual(expected.map(bindingsToString).sort());
      });
    });

    it('should handle a small set of bindings with duplicates', async() => {
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
          [ DF.variable('b'), DF.literal('2') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('2') ],
          [ DF.variable('b'), DF.literal('3') ],
        ]),
      ], { autoStart: false });
      variables0 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('b'), canBeUndef: false },
      ];
      action.entries[1].output.bindingsStream = new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('a'), DF.literal('1') ],
          [ DF.variable('c'), DF.literal('4') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('2') ],
          [ DF.variable('c'), DF.literal('5') ],
        ]),
      ], { autoStart: false });
      variables1 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('c'), canBeUndef: false },
      ];
      await actor.run(action, await getSideData(action)).then(async(output: IQueryOperationResultBindings) => {
        const expected = [
          BF.bindings([
            [ DF.variable('a'), DF.literal('1') ],
            [ DF.variable('b'), DF.literal('2') ],
            [ DF.variable('c'), DF.literal('4') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('1') ],
            [ DF.variable('b'), DF.literal('2') ],
            [ DF.variable('c'), DF.literal('4') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('2') ],
            [ DF.variable('b'), DF.literal('3') ],
            [ DF.variable('c'), DF.literal('5') ],
          ]),
        ];
        await expect(output.metadata()).resolves.toEqual({
          state: expect.any(MetadataValidationState),

          cardinality: { type: 'estimate', value: 20 },
          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
            { variable: DF.variable('b'), canBeUndef: false },
            { variable: DF.variable('c'), canBeUndef: false },
          ],
        });
        // Mapping to string and sorting since we don't know order (well, we sort of know, but we might not!)
        expect((await arrayifyStream(output.bindingsStream)).map(bindingsToString).sort())
          .toEqual(expected.map(bindingsToString).sort());
      });
    });

    it('should handle a small set of bindings with duplicates and undef in left', async() => {
      // Close the iterators already declared since we will not be using them
      for (const iter of iterators) {
        iter.destroy();
      }

      action.entries[0].output.bindingsStream = new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('b'), DF.literal('2') ],
        ]),
        BF.bindings([
          [ DF.variable('b'), DF.literal('2') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('2') ],
          [ DF.variable('b'), DF.literal('3') ],
        ]),
      ], { autoStart: false });
      variables0 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('b'), canBeUndef: false },
      ];
      action.entries[1].output.bindingsStream = new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('a'), DF.literal('1') ],
          [ DF.variable('c'), DF.literal('4') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('2') ],
          [ DF.variable('c'), DF.literal('5') ],
        ]),
      ], { autoStart: false });
      variables1 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('c'), canBeUndef: false },
      ];
      await actor.run(action, await getSideData(action)).then(async(output: IQueryOperationResultBindings) => {
        const expected = [
          BF.bindings([
            [ DF.variable('a'), DF.literal('1') ],
            [ DF.variable('b'), DF.literal('2') ],
            [ DF.variable('c'), DF.literal('4') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('1') ],
            [ DF.variable('b'), DF.literal('2') ],
            [ DF.variable('c'), DF.literal('4') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('2') ],
            [ DF.variable('b'), DF.literal('2') ],
            [ DF.variable('c'), DF.literal('5') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('2') ],
            [ DF.variable('b'), DF.literal('2') ],
            [ DF.variable('c'), DF.literal('5') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('2') ],
            [ DF.variable('b'), DF.literal('3') ],
            [ DF.variable('c'), DF.literal('5') ],
          ]),
        ];
        await expect(output.metadata()).resolves.toEqual({
          state: expect.any(MetadataValidationState),

          cardinality: { type: 'estimate', value: 20 },
          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
            { variable: DF.variable('b'), canBeUndef: false },
            { variable: DF.variable('c'), canBeUndef: false },
          ],
        });
        // Mapping to string and sorting since we don't know order (well, we sort of know, but we might not!)
        expect((await arrayifyStream(output.bindingsStream)).map(bindingsToString).sort())
          .toEqual(expected.map(bindingsToString).sort());
      });
    });

    it('should handle a small set of bindings with duplicates and undef in right', async() => {
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
          [ DF.variable('b'), DF.literal('2') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('2') ],
          [ DF.variable('b'), DF.literal('3') ],
        ]),
      ], { autoStart: false });
      variables0 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('b'), canBeUndef: false },
      ];
      action.entries[1].output.bindingsStream = new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('c'), DF.literal('4') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('2') ],
          [ DF.variable('c'), DF.literal('5') ],
        ]),
      ], { autoStart: false });
      variables1 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('c'), canBeUndef: false },
      ];
      await actor.run(action, await getSideData(action)).then(async(output: IQueryOperationResultBindings) => {
        const expected = [
          BF.bindings([
            [ DF.variable('a'), DF.literal('1') ],
            [ DF.variable('b'), DF.literal('2') ],
            [ DF.variable('c'), DF.literal('4') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('1') ],
            [ DF.variable('b'), DF.literal('2') ],
            [ DF.variable('c'), DF.literal('4') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('2') ],
            [ DF.variable('b'), DF.literal('3') ],
            [ DF.variable('c'), DF.literal('4') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('2') ],
            [ DF.variable('b'), DF.literal('3') ],
            [ DF.variable('c'), DF.literal('5') ],
          ]),
        ];
        await expect(output.metadata()).resolves.toEqual({
          state: expect.any(MetadataValidationState),

          cardinality: { type: 'estimate', value: 20 },
          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
            { variable: DF.variable('b'), canBeUndef: false },
            { variable: DF.variable('c'), canBeUndef: false },
          ],
        });
        // Mapping to string and sorting since we don't know order (well, we sort of know, but we might not!)
        expect((await arrayifyStream(output.bindingsStream)).map(bindingsToString).sort())
          .toEqual(expected.map(bindingsToString).sort());
      });
    });

    it('propagates errors in the left stream', async() => {
      // Close the iterators already declared since we will not be using them
      for (const iter of iterators) {
        iter.destroy();
      }

      const readable = new Readable();
      readable._read = () => {
        readable.emit('error', new Error('Error'));
      };
      action.entries[0].output.bindingsStream = <any> readable;
      variables0 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('b'), canBeUndef: false },
      ];
      action.entries[1].output.bindingsStream = new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('a'), DF.literal('1') ],
          [ DF.variable('c'), DF.literal('4') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('2') ],
          [ DF.variable('c'), DF.literal('5') ],
        ]),
      ], { autoStart: false });
      variables1 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('c'), canBeUndef: false },
      ];
      await actor.run(action, await getSideData(action)).then(async(output: IQueryOperationResultBindings) => {
        await expect(arrayifyStream(output.bindingsStream)).rejects.toThrow('Error');
      });
    });

    it('propagates errors in the right stream', async() => {
      // Close the iterators already declared since we will not be using them
      for (const iter of iterators) {
        iter.destroy();
      }

      const readable = new Readable();
      readable._read = () => {
        readable.emit('error', new Error('Error'));
      };
      action.entries[0].output.bindingsStream = new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('a'), DF.literal('1') ],
          [ DF.variable('c'), DF.literal('4') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('2') ],
          [ DF.variable('c'), DF.literal('5') ],
        ]),
      ], { autoStart: false });
      variables0 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('b'), canBeUndef: false },
      ];
      action.entries[1].output.bindingsStream = <any> readable;
      variables1 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('c'), canBeUndef: false },
      ];
      await actor.run(action, await getSideData(action)).then(async(output: IQueryOperationResultBindings) => {
        await expect(arrayifyStream(output.bindingsStream)).rejects.toThrow('Error');
      });
    });
  });
});
