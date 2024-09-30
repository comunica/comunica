import type { IActionQueryOperation } from '@comunica/bus-query-operation';
import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { IActionRdfJoinEntriesSort, MediatorRdfJoinEntriesSort } from '@comunica/bus-rdf-join-entries-sort';
import type { IActionRdfJoinSelectivity, IActorRdfJoinSelectivityOutput } from '@comunica/bus-rdf-join-selectivity';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext, IQueryOperationResultBindings } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Factory, Algebra } from 'sparqlalgebrajs';
import type { IActorRdfJoinMultiBindTestSideData } from '../lib/ActorRdfJoinMultiBind';
import { ActorRdfJoinMultiBind } from '../lib/ActorRdfJoinMultiBind';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const FACTORY = new Factory();
const mediatorMergeBindingsContext: any = {
  mediate: () => ({}),
};

describe('ActorRdfJoinMultiBind', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfJoinMultiBind instance', () => {
    let mediatorJoinSelectivity: Mediator<
    Actor<IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>,
    IActionRdfJoinSelectivity,
IActorTest,
IActorRdfJoinSelectivityOutput
>;
    let mediatorJoinEntriesSort: MediatorRdfJoinEntriesSort;
    let context: IActionContext;
    let mediatorQueryOperation: Mediator<
      Actor<IActionQueryOperation, IActorTest, IQueryOperationResultBindings>,
IActionQueryOperation,
IActorTest,
IQueryOperationResultBindings
>;
    let actor: ActorRdfJoinMultiBind;
    let logSpy: jest.SpyInstance;

    beforeEach(() => {
      mediatorJoinSelectivity = <any> {
        mediate: async() => ({ selectivity: 0.8 }),
      };
      mediatorJoinEntriesSort = <any> {
        async mediate(action: IActionRdfJoinEntriesSort) {
          const entries = [ ...action.entries ]
            .sort((left, right) => left.metadata.cardinality.value - right.metadata.cardinality.value);
          return { entries };
        },
      };
      context = new ActionContext({ a: 'b', [KeysInitQuery.dataFactory.name]: DF });
      mediatorQueryOperation = <any> {
        mediate: jest.fn(async(): Promise<IQueryOperationResultBindings> => {
          return {
            bindingsStream: new ArrayIterator<RDF.Bindings>([
              BF.bindings([
                [ DF.variable('bound'), DF.namedNode('ex:bound1') ],
              ]),
              BF.bindings([
                [ DF.variable('bound'), DF.namedNode('ex:bound2') ],
              ]),
              BF.bindings([
                [ DF.variable('bound'), DF.namedNode('ex:bound3') ],
              ]),
            ], { autoStart: false }),
            metadata: () => Promise.resolve({
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 3 },

              variables: [
                { variable: DF.variable('bound'), canBeUndef: false },
              ],
            }),
            type: 'bindings',
          };
        }),
      };
      actor = new ActorRdfJoinMultiBind({
        name: 'actor',
        bus,
        bindOrder: 'depth-first',
        selectivityModifier: 0.1,
        mediatorQueryOperation,
        mediatorJoinSelectivity,
        mediatorJoinEntriesSort,
        mediatorMergeBindingsContext,
        minMaxCardinalityRatio: 100,
      });
      logSpy = jest.spyOn((<any> actor), 'logDebug').mockImplementation();
    });

    async function getSideData(action: IActionRdfJoin): Promise<IActorRdfJoinMultiBindTestSideData> {
      return (await actor.test(action)).getSideData();
    }

    describe('getJoinCoefficients', () => {
      it('should handle three entries', async() => {
        await expect(actor.getJoinCoefficients(
          {
            type: 'inner',
            entries: [
              {
                output: <any>{},
                operation: FACTORY.createNop(),
              },
              {
                output: <any>{},
                operation: FACTORY.createNop(),
              },
              {
                output: <any>{},
                operation: FACTORY.createNop(),
              },
            ],
            context: new ActionContext(),
          },
          {
            metadatas: [
              {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 3 },
                pageSize: 100,
                requestTime: 10,

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                ],
              },
              {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 2 },
                pageSize: 100,
                requestTime: 20,

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                ],
              },
              {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 500 },
                pageSize: 100,
                requestTime: 30,

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                ],
              },
            ],
          },
        )).resolves.toPassTest({
          iterations: 80.48000000000002,
          persistedItems: 0,
          blockingItems: 0,
          requestTime: 32.592000000000006,
        });
      });

      it('should handle three entries with a lower variable overlap', async() => {
        await expect(actor.getJoinCoefficients(
          {
            type: 'inner',
            entries: [
              {
                output: <any>{},
                operation: FACTORY.createNop(),
              },
              {
                output: <any>{},
                operation: FACTORY.createNop(),
              },
              {
                output: <any>{},
                operation: FACTORY.createNop(),
              },
            ],
            context: new ActionContext(),
          },
          {
            metadatas: [
              {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 3 },
                pageSize: 100,
                requestTime: 10,

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                  { variable: DF.variable('b'), canBeUndef: false },
                ],
              },
              {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 2 },
                pageSize: 100,
                requestTime: 20,

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                  { variable: DF.variable('b'), canBeUndef: false },
                ],
              },
              {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 500 },
                pageSize: 100,
                requestTime: 30,

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                  { variable: DF.variable('b'), canBeUndef: false },
                ],
              },
            ],
          },
        )).resolves.toPassTest({
          iterations: 80.48000000000002,
          persistedItems: 0,
          blockingItems: 0,
          requestTime: 32.592000000000006,
        });
      });

      it('should reject on a right stream of type extend', async() => {
        await expect(actor.getJoinCoefficients(
          {
            type: 'inner',
            entries: [
              {
                output: <any>{
                  metadata: () => Promise.resolve({
                    cardinality: { type: 'estimate', value: 3 },

                  }),

                },
                operation: <any>{ type: Algebra.types.EXTEND },
              },
              {
                output: <any>{
                  metadata: () => Promise.resolve({
                    cardinality: { type: 'estimate', value: 2 },

                  }),
                },
                operation: <any>{},
              },
            ],
            context: new ActionContext(),
          },
          {
            metadatas: [
              {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 3 },
                pageSize: 100,
                requestTime: 10,

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                ],
              },
              {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 2 },
                pageSize: 100,
                requestTime: 20,

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                ],
              },
            ],
          },
        )).resolves.toFailTest('Actor actor can not bind on Extend and Group operations');
      });

      it('should reject on a right stream of type group', async() => {
        await expect(actor.getJoinCoefficients(
          {
            type: 'inner',
            entries: [
              {
                output: <any> {},
                operation: <any> { type: Algebra.types.GROUP },
              },
              {
                output: <any> {},
                operation: <any> {},
              },
            ],
            context: new ActionContext(),
          },
          {
            metadatas: [
              {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 3 },
                pageSize: 100,
                requestTime: 10,

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                ],
              },
              {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 2 },
                pageSize: 100,
                requestTime: 20,

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                ],
              },
            ],
          },
        )).resolves.toFailTest('Actor actor can not bind on Extend and Group operations');
      });

      it('should reject on a right stream containing group', async() => {
        await expect(actor.getJoinCoefficients(
          {
            type: 'inner',
            entries: [
              {
                output: <any> {},
                operation: FACTORY.createProject(<any>{ type: Algebra.types.GROUP }, []),
              },
              {
                output: <any> {},
                operation: <any> {},
              },
            ],
            context: new ActionContext(),
          },
          {
            metadatas: [
              {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 3 },
                pageSize: 100,
                requestTime: 10,

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                ],
              },
              {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 2 },
                pageSize: 100,
                requestTime: 20,

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                ],
              },
            ],
          },
        )).resolves.toFailTest('Actor actor can not bind on Extend and Group operations');
      });

      it('should not reject on a left stream of type group', async() => {
        await expect(actor.getJoinCoefficients(
          {
            type: 'inner',
            entries: [
              {
                output: <any> {},
                operation: FACTORY.createNop(),
              },
              {
                output: <any> {},
                operation: <any> { type: Algebra.types.GROUP },
              },
            ],
            context: new ActionContext(),
          },
          {
            metadatas: [
              {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 300 },
                pageSize: 100,
                requestTime: 10,

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                ],
              },
              {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 2 },
                pageSize: 100,
                requestTime: 20,

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                ],
              },
            ],
          },
        )).resolves.toPassTest({
          iterations: 48.00000000000001,
          persistedItems: 0,
          blockingItems: 0,
          requestTime: 5.200000000000001,
        });
      });

      it('should reject on a stream containing a modified operation', async() => {
        await expect(actor.getJoinCoefficients(
          {
            type: 'inner',
            entries: [
              {
                output: <any> {},
                operation: FACTORY.createNop(),
                operationModified: true,
              },
              {
                output: <any> {},
                operation: FACTORY.createNop(),
              },
            ],
            context: new ActionContext(),
          },
          {
            metadatas: [
              {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 3 },
                pageSize: 100,
                requestTime: 10,

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                ],
              },
              {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 2 },
                pageSize: 100,
                requestTime: 20,

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                ],
              },
            ],
          },
        )).resolves.toFailTest('Actor actor can not be used over remaining entries with modified operations');
      });

      it('should reject if smallest is not significantly smaller than the largest', async() => {
        await expect(actor.getJoinCoefficients(
          {
            type: 'inner',
            entries: [
              {
                output: <any>{},
                operation: FACTORY.createNop(),
              },
              {
                output: <any>{},
                operation: FACTORY.createNop(),
              },
              {
                output: <any>{},
                operation: FACTORY.createNop(),
              },
            ],
            context: new ActionContext(),
          },
          {
            metadatas: [
              {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 3 },
                pageSize: 100,
                requestTime: 10,

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                ],
              },
              {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 2 },
                pageSize: 100,
                requestTime: 20,

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                ],
              },
              {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 5 },
                pageSize: 100,
                requestTime: 30,

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                ],
              },
            ],
          },
        )).resolves.toFailTest(`Actor actor can only run if the smallest stream is much smaller than largest stream`);
      });
    });

    describe('createBindStream', () => {
      it('throws when an unknown bind order is passed', async() => {
        await expect(
          async() => await (<any> ActorRdfJoinMultiBind).createBindStream('unknown').catch((error: any) => {
            throw new Error(error);
          }),
        )
          .rejects
          .toThrow(`Received request for unknown bind order: unknown`);
      });
    });

    describe('sortJoinEntries', () => {
      it('sorts 2 entries', async() => {
        await expect(ActorRdfJoin.sortJoinEntries(
          mediatorJoinEntriesSort,
          [
            {
              output: <any> {},
              operation: <any> {},
              metadata: {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 3 },

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                ],
              },
            },
            {
              output: <any> {},
              operation: <any> {},
              metadata: {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 2 },

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                ],
              },
            },
          ],
          context,
        )).resolves.toPassTest([
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 2 },

              variables: [
                { variable: DF.variable('a'), canBeUndef: false },
              ],
            },
          },
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 3 },

              variables: [
                { variable: DF.variable('a'), canBeUndef: false },
              ],
            },
          },
        ]);
      });

      it('sorts 3 entries', async() => {
        await expect(ActorRdfJoin.sortJoinEntries(mediatorJoinEntriesSort, [
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 3 },

              variables: [
                { variable: DF.variable('a'), canBeUndef: false },
              ],
            },
          },
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 2 },

              variables: [
                { variable: DF.variable('a'), canBeUndef: false },
              ],
            },
          },
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 5 },

              variables: [
                { variable: DF.variable('a'), canBeUndef: false },
              ],
            },
          },
        ], context)).resolves.toPassTest([
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 2 },

              variables: [
                { variable: DF.variable('a'), canBeUndef: false },
              ],
            },
          },
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 3 },

              variables: [
                { variable: DF.variable('a'), canBeUndef: false },
              ],
            },
          },
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 5 },

              variables: [
                { variable: DF.variable('a'), canBeUndef: false },
              ],
            },
          },
        ]);
      });

      it('sorts 3 equal entries', async() => {
        await expect(ActorRdfJoin.sortJoinEntries(
          mediatorJoinEntriesSort,
          [
            {
              output: <any> {},
              operation: <any> {},
              metadata: {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 3 },

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                ],
              },
            },
            {
              output: <any> {},
              operation: <any> {},
              metadata: {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 3 },

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                ],
              },
            },
            {
              output: <any> {},
              operation: <any> {},
              metadata: {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 3 },

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                ],
              },
            },
          ],
          context,
        )).resolves.toPassTest([
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 3 },

              variables: [
                { variable: DF.variable('a'), canBeUndef: false },
              ],
            },
          },
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 3 },

              variables: [
                { variable: DF.variable('a'), canBeUndef: false },
              ],
            },
          },
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 3 },

              variables: [
                { variable: DF.variable('a'), canBeUndef: false },
              ],
            },
          },
        ]);
      });

      it('does not sort if there is an undef', async() => {
        await expect(ActorRdfJoin.sortJoinEntries(
          mediatorJoinEntriesSort,
          [
            {
              output: <any> {},
              operation: <any> {},
              metadata: {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 3 },

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                ],
              },
            },
            {
              output: <any> {},
              operation: <any> {},
              metadata: {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 2 },

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                ],
              },
            },
            {
              output: <any> {},
              operation: <any> {},
              metadata: {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 5 },
                variables: [
                  { variable: DF.variable('a'), canBeUndef: true },
                ],
              },
            },
          ],
          context,
        )).resolves.toPassTest([
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 3 },

              variables: [
                { variable: DF.variable('a'), canBeUndef: false },
              ],
            },
          },
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 2 },

              variables: [
                { variable: DF.variable('a'), canBeUndef: false },
              ],
            },
          },
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 5 },
              variables: [
                { variable: DF.variable('a'), canBeUndef: true },
              ],
            },
          },
        ]);
      });

      it('throws if there are no overlapping variables', async() => {
        await expect(ActorRdfJoin.sortJoinEntries(
          mediatorJoinEntriesSort,
          [
            {
              output: <any> {},
              operation: <any> {},
              metadata: {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 3 },

                variables: [
                  { variable: DF.variable('a1'), canBeUndef: false },
                  { variable: DF.variable('b1'), canBeUndef: false },
                ],
              },
            },
            {
              output: <any> {},
              operation: <any> {},
              metadata: {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 2 },

                variables: [
                  { variable: DF.variable('a2'), canBeUndef: false },
                  { variable: DF.variable('b2'), canBeUndef: false },
                ],
              },
            },
          ],
          context,
        )).resolves.toFailTest('Bind join can only join entries with at least one common variable');
      });

      it('sorts entries without common variables in the back', async() => {
        await expect(ActorRdfJoin.sortJoinEntries(
          mediatorJoinEntriesSort,
          [
            {
              output: <any> {},
              operation: <any> {},
              metadata: {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 1 },

                variables: [
                  { variable: DF.variable('b'), canBeUndef: false },
                ],
              },
            },
            {
              output: <any> {},
              operation: <any> {},
              metadata: {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 3 },

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                ],
              },
            },
            {
              output: <any> {},
              operation: <any> {},
              metadata: {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 2 },

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                ],
              },
            },
          ],
          context,
        )).resolves.toPassTest([
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 2 },

              variables: [
                { variable: DF.variable('a'), canBeUndef: false },
              ],
            },
          },
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 3 },

              variables: [
                { variable: DF.variable('a'), canBeUndef: false },
              ],
            },
          },
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 1 },

              variables: [
                { variable: DF.variable('b'), canBeUndef: false },
              ],
            },
          },
        ]);
      });

      it('sorts several entries without variables in the back', async() => {
        await expect(ActorRdfJoin.sortJoinEntries(
          mediatorJoinEntriesSort,
          [
            {
              output: <any> {},
              operation: <any> {},
              metadata: {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 3 },

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                ],
              },
            },
            {
              output: <any> {},
              operation: <any> {},
              metadata: {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 1 },

                variables: [
                  { variable: DF.variable('b'), canBeUndef: false },
                ],
              },
            },
            {
              output: <any> {},
              operation: <any> {},
              metadata: {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 20 },

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                ],
              },
            },
            {
              output: <any> {},
              operation: <any> {},
              metadata: {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 20 },

                variables: [
                  { variable: DF.variable('c'), canBeUndef: false },
                ],
              },
            },
            {
              output: <any> {},
              operation: <any> {},
              metadata: {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 2 },

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                ],
              },
            },
            {
              output: <any> {},
              operation: <any> {},
              metadata: {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 10 },

                variables: [
                  { variable: DF.variable('d'), canBeUndef: false },
                ],
              },
            },
            {
              output: <any> {},
              operation: <any> {},
              metadata: {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 10 },

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                ],
              },
            },
          ],
          context,
        )).resolves.toPassTest([
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 2 },

              variables: [
                { variable: DF.variable('a'), canBeUndef: false },
              ],
            },
          },
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 3 },

              variables: [
                { variable: DF.variable('a'), canBeUndef: false },
              ],
            },
          },
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 10 },

              variables: [
                { variable: DF.variable('a'), canBeUndef: false },
              ],
            },
          },
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 20 },

              variables: [
                { variable: DF.variable('a'), canBeUndef: false },
              ],
            },
          },
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 1 },

              variables: [
                { variable: DF.variable('b'), canBeUndef: false },
              ],
            },
          },
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 10 },

              variables: [
                { variable: DF.variable('d'), canBeUndef: false },
              ],
            },
          },
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 20 },

              variables: [
                { variable: DF.variable('c'), canBeUndef: false },
              ],
            },
          },
        ]);
      });
    });

    describe('getOutput', () => {
      it('should handle two entries (depth-first)', async() => {
        const action: IActionRdfJoin = {
          context,
          type: 'inner',
          entries: [
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([
                    [ DF.variable('b'), DF.namedNode('ex:b1') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('b'), DF.namedNode('ex:b2') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('b'), DF.namedNode('ex:b3') ],
                  ]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 300 },

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                    { variable: DF.variable('b'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: FACTORY.createPattern(DF.variable('a'), DF.namedNode('ex:p1'), DF.variable('b')),
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([
                    [ DF.variable('a'), DF.namedNode('ex:a1') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('a'), DF.namedNode('ex:a2') ],
                  ]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 1 },

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: FACTORY.createPattern(DF.variable('a'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
            },
          ],
        };
        const { result, physicalPlanMetadata } = await actor.getOutput(action, await getSideData(action));

        // Validate output
        expect(result.type).toBe('bindings');
        await expect(result.bindingsStream).toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('bound'), DF.namedNode('ex:bound1') ],
            [ DF.variable('a'), DF.namedNode('ex:a1') ],
          ]),
          BF.bindings([
            [ DF.variable('bound'), DF.namedNode('ex:bound2') ],
            [ DF.variable('a'), DF.namedNode('ex:a1') ],
          ]),
          BF.bindings([
            [ DF.variable('bound'), DF.namedNode('ex:bound3') ],
            [ DF.variable('a'), DF.namedNode('ex:a1') ],
          ]),
          BF.bindings([
            [ DF.variable('bound'), DF.namedNode('ex:bound1') ],
            [ DF.variable('a'), DF.namedNode('ex:a2') ],
          ]),
          BF.bindings([
            [ DF.variable('bound'), DF.namedNode('ex:bound2') ],
            [ DF.variable('a'), DF.namedNode('ex:a2') ],
          ]),
          BF.bindings([
            [ DF.variable('bound'), DF.namedNode('ex:bound3') ],
            [ DF.variable('a'), DF.namedNode('ex:a2') ],
          ]),
        ]);
        await expect(result.metadata()).resolves.toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: 240 },

          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
            { variable: DF.variable('b'), canBeUndef: false },
          ],
        });

        // Validate physicalPlanMetadata
        expect(physicalPlanMetadata).toEqual({
          bindIndex: 1,
          bindOperation: FACTORY
            .createPattern(DF.variable('a'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
          bindOperationCardinality: { type: 'estimate', value: 1 },
          bindOrder: 'depth-first',
        });

        // Validate mock calls
        expect(logSpy).toHaveBeenCalledWith(context, 'First entry for Bind Join: ', expect.any(Function));
        expect(logSpy.mock.calls[0][2]()).toEqual({
          entry: action.entries[1].operation,
          metadata: {
            state: expect.any(MetadataValidationState),
            cardinality: { type: 'estimate', value: 1 },

            variables: [
              { variable: DF.variable('a'), canBeUndef: false },
            ],
          },
        });
        expect(mediatorQueryOperation.mediate).toHaveBeenCalledTimes(2);
        expect(mediatorQueryOperation.mediate).toHaveBeenNthCalledWith(1, {
          operation: FACTORY.createPattern(DF.namedNode('ex:a1'), DF.namedNode('ex:p1'), DF.variable('b')),
          context: new ActionContext({
            a: 'b',
            [KeysInitQuery.dataFactory.name]: DF,
            [KeysQueryOperation.joinLeftMetadata.name]: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 1 },

              variables: [
                { variable: DF.variable('a'), canBeUndef: false },
              ],
            },
            [KeysQueryOperation.joinRightMetadatas.name]: [{
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 300 },

              variables: [
                { variable: DF.variable('a'), canBeUndef: false },
                { variable: DF.variable('b'), canBeUndef: false },
              ],
            }],
            [KeysQueryOperation.joinBindings.name]: BF.bindings([
              [ DF.variable('a'), DF.namedNode('ex:a1') ],
            ]),
          }),
        });
        expect(mediatorQueryOperation.mediate).toHaveBeenNthCalledWith(2, {
          operation: FACTORY.createPattern(DF.namedNode('ex:a2'), DF.namedNode('ex:p1'), DF.variable('b')),
          context: new ActionContext({
            a: 'b',
            [KeysInitQuery.dataFactory.name]: DF,
            [KeysQueryOperation.joinLeftMetadata.name]: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 1 },

              variables: [
                { variable: DF.variable('a'), canBeUndef: false },
              ],
            },
            [KeysQueryOperation.joinRightMetadatas.name]: [{
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 300 },

              variables: [
                { variable: DF.variable('a'), canBeUndef: false },
                { variable: DF.variable('b'), canBeUndef: false },
              ],
            }],
            [KeysQueryOperation.joinBindings.name]: BF.bindings([
              [ DF.variable('a'), DF.namedNode('ex:a2') ],
            ]),
          }),
        });
      });

      it('should handle two entries (breadth-first)', async() => {
        actor = new ActorRdfJoinMultiBind({
          name: 'actor',
          bus,
          bindOrder: 'breadth-first',
          selectivityModifier: 0.1,
          minMaxCardinalityRatio: 100,
          mediatorQueryOperation,
          mediatorJoinSelectivity,
          mediatorJoinEntriesSort,
          mediatorMergeBindingsContext,
        });

        const action: IActionRdfJoin = {
          context,
          type: 'inner',
          entries: [
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([
                    [ DF.variable('b'), DF.namedNode('ex:b1') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('b'), DF.namedNode('ex:b2') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('b'), DF.namedNode('ex:b3') ],
                  ]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 300 },

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                    { variable: DF.variable('b'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: FACTORY.createPattern(DF.variable('a'), DF.namedNode('ex:p1'), DF.variable('b')),
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([
                    [ DF.variable('a'), DF.namedNode('ex:a1') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('a'), DF.namedNode('ex:a2') ],
                  ]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 1 },

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: FACTORY.createPattern(DF.variable('a'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
            },
          ],
        };
        const { result } = await actor.getOutput(action, await getSideData(action));

        // Validate output
        expect(result.type).toBe('bindings');
        await expect(result.bindingsStream).toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('bound'), DF.namedNode('ex:bound1') ],
            [ DF.variable('a'), DF.namedNode('ex:a1') ],
          ]),
          BF.bindings([
            [ DF.variable('bound'), DF.namedNode('ex:bound1') ],
            [ DF.variable('a'), DF.namedNode('ex:a2') ],
          ]),
          BF.bindings([
            [ DF.variable('bound'), DF.namedNode('ex:bound2') ],
            [ DF.variable('a'), DF.namedNode('ex:a1') ],
          ]),
          BF.bindings([
            [ DF.variable('bound'), DF.namedNode('ex:bound3') ],
            [ DF.variable('a'), DF.namedNode('ex:a1') ],
          ]),
          BF.bindings([
            [ DF.variable('bound'), DF.namedNode('ex:bound2') ],
            [ DF.variable('a'), DF.namedNode('ex:a2') ],
          ]),
          BF.bindings([
            [ DF.variable('bound'), DF.namedNode('ex:bound3') ],
            [ DF.variable('a'), DF.namedNode('ex:a2') ],
          ]),
        ]);
        await expect(result.metadata()).resolves.toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: 240 },

          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
            { variable: DF.variable('b'), canBeUndef: false },
          ],
        });
      });

      it('should handle two entries without context', async() => {
        const action: IActionRdfJoin = {
          type: 'inner',
          entries: [
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([
                    [ DF.variable('b'), DF.namedNode('ex:b1') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('b'), DF.namedNode('ex:b2') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('b'), DF.namedNode('ex:b3') ],
                  ]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 300 },

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                    { variable: DF.variable('b'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: FACTORY.createPattern(DF.variable('a'), DF.namedNode('ex:p1'), DF.variable('b')),
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([
                    [ DF.variable('a'), DF.namedNode('ex:a1') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('a'), DF.namedNode('ex:a2') ],
                  ]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 1 },

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: FACTORY.createPattern(DF.variable('a'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
            },
          ],
          context,
        };
        const { result } = await actor.getOutput(action, await getSideData(action));

        // Validate output
        expect(result.type).toBe('bindings');
        await expect(result.bindingsStream).toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('bound'), DF.namedNode('ex:bound1') ],
            [ DF.variable('a'), DF.namedNode('ex:a1') ],
          ]),
          BF.bindings([
            [ DF.variable('bound'), DF.namedNode('ex:bound2') ],
            [ DF.variable('a'), DF.namedNode('ex:a1') ],
          ]),
          BF.bindings([
            [ DF.variable('bound'), DF.namedNode('ex:bound3') ],
            [ DF.variable('a'), DF.namedNode('ex:a1') ],
          ]),
          BF.bindings([
            [ DF.variable('bound'), DF.namedNode('ex:bound1') ],
            [ DF.variable('a'), DF.namedNode('ex:a2') ],
          ]),
          BF.bindings([
            [ DF.variable('bound'), DF.namedNode('ex:bound2') ],
            [ DF.variable('a'), DF.namedNode('ex:a2') ],
          ]),
          BF.bindings([
            [ DF.variable('bound'), DF.namedNode('ex:bound3') ],
            [ DF.variable('a'), DF.namedNode('ex:a2') ],
          ]),
        ]);
        await expect(result.metadata()).resolves.toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: 240 },

          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
            { variable: DF.variable('b'), canBeUndef: false },
          ],
        });
      });

      it('should handle three entries (depth-first)', async() => {
        const action: IActionRdfJoin = {
          context,
          type: 'inner',
          entries: [
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([
                    [ DF.variable('b'), DF.namedNode('ex:b1') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('b'), DF.namedNode('ex:b2') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('b'), DF.namedNode('ex:b3') ],
                  ]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 300 },

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                    { variable: DF.variable('b'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: FACTORY.createPattern(DF.variable('a'), DF.namedNode('ex:p1'), DF.variable('b')),
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([
                    [ DF.variable('c'), DF.namedNode('ex:c1') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('c'), DF.namedNode('ex:c2') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('c'), DF.namedNode('ex:c3') ],
                  ]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 400 },

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                    { variable: DF.variable('c'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: FACTORY.createPattern(DF.variable('a'), DF.namedNode('ex:p2'), DF.variable('c')),
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([
                    [ DF.variable('a'), DF.namedNode('ex:a1') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('a'), DF.namedNode('ex:a2') ],
                  ]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 1 },

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: FACTORY.createPattern(DF.variable('a'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
            },
          ],
        };
        const { result } = await actor.getOutput(action, await getSideData(action));

        // Validate output
        expect(result.type).toBe('bindings');
        await expect(result.bindingsStream).toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('bound'), DF.namedNode('ex:bound1') ],
            [ DF.variable('a'), DF.namedNode('ex:a1') ],
          ]),
          BF.bindings([
            [ DF.variable('bound'), DF.namedNode('ex:bound2') ],
            [ DF.variable('a'), DF.namedNode('ex:a1') ],
          ]),
          BF.bindings([
            [ DF.variable('bound'), DF.namedNode('ex:bound3') ],
            [ DF.variable('a'), DF.namedNode('ex:a1') ],
          ]),
          BF.bindings([
            [ DF.variable('bound'), DF.namedNode('ex:bound1') ],
            [ DF.variable('a'), DF.namedNode('ex:a2') ],
          ]),
          BF.bindings([
            [ DF.variable('bound'), DF.namedNode('ex:bound2') ],
            [ DF.variable('a'), DF.namedNode('ex:a2') ],
          ]),
          BF.bindings([
            [ DF.variable('bound'), DF.namedNode('ex:bound3') ],
            [ DF.variable('a'), DF.namedNode('ex:a2') ],
          ]),
        ]);
        await expect(result.metadata()).resolves.toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: 96000 },

          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
            { variable: DF.variable('b'), canBeUndef: false },
            { variable: DF.variable('c'), canBeUndef: false },
          ],
        });

        // Validate mock calls
        expect(logSpy).toHaveBeenCalledWith(context, 'First entry for Bind Join: ', expect.any(Function));
        expect(logSpy.mock.calls[0][2]()).toEqual({
          entry: action.entries[2].operation,
          metadata: {
            state: expect.any(MetadataValidationState),
            cardinality: { type: 'estimate', value: 1 },

            variables: [
              { variable: DF.variable('a'), canBeUndef: false },
            ],
          },
        });
        expect(mediatorQueryOperation.mediate).toHaveBeenCalledTimes(2);
        expect(mediatorQueryOperation.mediate).toHaveBeenNthCalledWith(1, {
          operation: FACTORY.createJoin([
            FACTORY.createPattern(DF.namedNode('ex:a1'), DF.namedNode('ex:p1'), DF.variable('b')),
            FACTORY.createPattern(DF.namedNode('ex:a1'), DF.namedNode('ex:p2'), DF.variable('c')),
          ]),
          context: new ActionContext({
            a: 'b',
            [KeysInitQuery.dataFactory.name]: DF,
            [KeysQueryOperation.joinLeftMetadata.name]: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 1 },

              variables: [
                { variable: DF.variable('a'), canBeUndef: false },
              ],
            },
            [KeysQueryOperation.joinRightMetadatas.name]: [
              {
                state: expect.any(MetadataValidationState),
                cardinality: { type: 'estimate', value: 300 },

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                  { variable: DF.variable('b'), canBeUndef: false },
                ],
              },
              {
                state: expect.any(MetadataValidationState),
                cardinality: { type: 'estimate', value: 400 },

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                  { variable: DF.variable('c'), canBeUndef: false },
                ],
              },
            ],
            [KeysQueryOperation.joinBindings.name]: BF.bindings([
              [ DF.variable('a'), DF.namedNode('ex:a1') ],
            ]),
          }),
        });
        expect(mediatorQueryOperation.mediate).toHaveBeenNthCalledWith(2, {
          operation: FACTORY.createJoin([
            FACTORY.createPattern(DF.namedNode('ex:a2'), DF.namedNode('ex:p1'), DF.variable('b')),
            FACTORY.createPattern(DF.namedNode('ex:a2'), DF.namedNode('ex:p2'), DF.variable('c')),
          ]),
          context: new ActionContext({
            a: 'b',
            [KeysInitQuery.dataFactory.name]: DF,
            [KeysQueryOperation.joinLeftMetadata.name]: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 1 },

              variables: [
                { variable: DF.variable('a'), canBeUndef: false },
              ],
            },
            [KeysQueryOperation.joinRightMetadatas.name]: [
              {
                state: expect.any(MetadataValidationState),
                cardinality: { type: 'estimate', value: 300 },

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                  { variable: DF.variable('b'), canBeUndef: false },
                ],
              },
              {
                state: expect.any(MetadataValidationState),
                cardinality: { type: 'estimate', value: 400 },

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                  { variable: DF.variable('c'), canBeUndef: false },
                ],
              },
            ],
            [KeysQueryOperation.joinBindings.name]: BF.bindings([
              [ DF.variable('a'), DF.namedNode('ex:a2') ],
            ]),
          }),
        });
      });
    });
  });
});
