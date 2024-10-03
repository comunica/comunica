import type { MediatorHashBindings } from '@comunica/bus-hash-bindings';
import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
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
import { ActorRdfJoinSymmetricHash } from '../lib/ActorRdfJoinSymmetricHash';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

function bindingsToString(b: Bindings): string {
  // eslint-disable-next-line ts/require-array-sort-compare
  const keys = [ ...b.keys() ].sort();
  return keys.map(k => `${k.value}:${b.get(k)!.value}`).toString();
}

describe('ActorRdfJoinSymmetricHash', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
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
      expect(() => {
        (<any> ActorRdfJoinSymmetricHash)();
      }).toThrow(`Class constructor ActorRdfJoinSymmetricHash cannot be invoked without 'new'`);
    });
  });

  describe('An ActorRdfJoinSymmetricHash instance', () => {
    let mediatorJoinSelectivity: Mediator<
    Actor<IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>,
    IActionRdfJoinSelectivity,
IActorTest,
IActorRdfJoinSelectivityOutput
>;
    let mediatorHashBindings: MediatorHashBindings;
    let actor: ActorRdfJoinSymmetricHash;
    let action: IActionRdfJoin;
    let variables0: MetadataVariable[];
    let variables1: MetadataVariable[];

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
      actor = new ActorRdfJoinSymmetricHash({ name: 'actor', bus, mediatorJoinSelectivity, mediatorHashBindings });
      variables0 = [
        { variable: DF.variable('a'), canBeUndef: false },
      ];
      variables1 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('b'), canBeUndef: false },
      ];
      action = {
        type: 'inner',
        entries: [
          {
            output: {
              bindingsStream: new ArrayIterator<RDF.Bindings>([], { autoStart: false }),
              metadata: () => Promise.resolve({
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 4 },

                variables: variables0,
              }),
              type: 'bindings',
            },
            operation: <any> {},
          },
          {
            output: {
              bindingsStream: new ArrayIterator<RDF.Bindings>([], { autoStart: false }),
              metadata: () => Promise.resolve({
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 5 },

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

    describe('should test', () => {
      afterEach(() => {
        for (const { output } of action.entries) {
          output?.bindingsStream.destroy();
        }
      });

      it('should fail on undefs in left stream', async() => {
        action = {
          type: 'inner',
          entries: [
            {
              output: {
                bindingsStream: new ArrayIterator<RDF.Bindings>([], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 4 },
                  variables: [{ variable: DF.variable('a'), canBeUndef: true }],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
            {
              output: {
                bindingsStream: new ArrayIterator<RDF.Bindings>([], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 5 },

                  variables: [{ variable: DF.variable('a'), canBeUndef: false }],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
          ],
          context,
        };
        await expect(actor.test(action)).resolves
          .toFailTest('Actor actor can not join streams containing undefs');
      });

      it('should fail on undefs in right stream', async() => {
        action = {
          type: 'inner',
          entries: [
            {
              output: {
                bindingsStream: new ArrayIterator<RDF.Bindings>([], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 4 },

                  variables: [{ variable: DF.variable('a'), canBeUndef: false }],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
            {
              output: {
                bindingsStream: new ArrayIterator<RDF.Bindings>([], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 5 },
                  variables: [{ variable: DF.variable('a'), canBeUndef: true }],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
          ],
          context,
        };
        await expect(actor.test(action)).resolves
          .toFailTest('Actor actor can not join streams containing undefs');
      });

      it('should fail on undefs in left and right stream', async() => {
        action = {
          type: 'inner',
          entries: [
            {
              output: {
                bindingsStream: new ArrayIterator<RDF.Bindings>([], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 4 },
                  variables: [{ variable: DF.variable('a'), canBeUndef: true }],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
            {
              output: {
                bindingsStream: new ArrayIterator<RDF.Bindings>([], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 5 },
                  variables: [{ variable: DF.variable('a'), canBeUndef: true }],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
          ],
          context,
        };
        await expect(actor.test(action)).resolves
          .toFailTest('Actor actor can not join streams containing undefs');
      });

      it('should fail on non-overlapping variables', async() => {
        action = {
          type: 'inner',
          entries: [
            {
              output: {
                bindingsStream: new ArrayIterator<RDF.Bindings>([], { autoStart: false }),
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
                bindingsStream: new ArrayIterator<RDF.Bindings>([], { autoStart: false }),
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
      });

      it('should generate correct test metadata', async() => {
        await expect(actor.test(action)).resolves
          .toPassTest({ iterations: 9, persistedItems: 9, blockingItems: 0, requestTime: 0 });
      });
    });

    it('should generate correct metadata', async() => {
      await actor.run(action, undefined!).then(async(result: IQueryOperationResultBindings) => {
        await expect((<any> result).metadata()).resolves.toHaveProperty('cardinality', {
          type: 'estimate',
          value: (await (<any> action.entries[0].output).metadata()).cardinality.value *
          (await (<any> action.entries[1].output).metadata()).cardinality.value,
        });

        await expect(result.bindingsStream.toArray()).resolves.toEqual([]);
      });
    });

    it('should return an empty stream for empty input', async() => {
      await actor.run(action, undefined!).then(async(output: IQueryOperationResultBindings) => {
        await expect(output.metadata()).resolves.toEqual({
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
      // Close of the bindings streams that we are not going to use
      for (const { output } of action.entries) {
        output?.bindingsStream.destroy();
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
          [ DF.variable('a'), DF.literal('a') ],
          [ DF.variable('c'), DF.literal('c') ],
        ]),
      ]);
      variables1 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('c'), canBeUndef: false },
      ];
      await actor.run(action, undefined!).then(async(output: IQueryOperationResultBindings) => {
        await expect(output.metadata()).resolves.toEqual({
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
      // Close of the bindings streams that we are not going to use
      for (const { output } of action.entries) {
        output?.bindingsStream.destroy();
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
      await actor.run(action, undefined!).then(async(output: IQueryOperationResultBindings) => {
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
      // Close of the bindings streams that we are not going to use
      for (const { output } of action.entries) {
        output?.bindingsStream.destroy();
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
      ]);
      variables1 = [
        { variable: DF.variable('a'), canBeUndef: false },
        { variable: DF.variable('c'), canBeUndef: false },
      ];
      await actor.run(action, undefined!).then(async(output: IQueryOperationResultBindings) => {
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
  });
});
