import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActionQueryOperation } from '@comunica/bus-query-operation';
import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { IActionRdfJoinEntriesSort, MediatorRdfJoinEntriesSort } from '@comunica/bus-rdf-join-entries-sort';
import type { IActionRdfJoinSelectivity, IActorRdfJoinSelectivityOutput } from '@comunica/bus-rdf-join-selectivity';
import { KeysQueryOperation } from '@comunica/context-entries';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import { ActionContext, Bus } from '@comunica/core';
import { MetadataValidationState } from '@comunica/metadata';
import type { IActionContext, IQueryOperationResultBindings } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Factory, Algebra } from 'sparqlalgebrajs';
import { ActorRdfJoinMultiBind } from '../lib/ActorRdfJoinMultiBind';
import '@comunica/jest';

const DF = new DataFactory();
const BF = new BindingsFactory();
const FACTORY = new Factory();
const mediatorMergeBindingsContext: any = {
  mediate(arg: any) {
    return {};
  },
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
      context = new ActionContext({ a: 'b' });
      mediatorQueryOperation = <any> {
        mediate: jest.fn(async(arg: IActionQueryOperation): Promise<IQueryOperationResultBindings> => {
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
              canContainUndefs: false,
              variables: [ DF.variable('bound') ],
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
      });
      logSpy = jest.spyOn((<any> actor), 'logDebug').mockImplementation();
    });

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
          [
            {
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 3 },
              pageSize: 100,
              requestTime: 10,
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
            {
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 2 },
              pageSize: 100,
              requestTime: 20,
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
            {
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 5 },
              pageSize: 100,
              requestTime: 30,
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
          ],
        )).resolves.toEqual({
          iterations: 1.280_000_000_000_000_2,
          persistedItems: 0,
          blockingItems: 0,
          requestTime: 0.912_000_000_000_000_1,
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
          [
            {
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 3 },
              pageSize: 100,
              requestTime: 10,
              canContainUndefs: false,
              variables: [ DF.variable('a'), DF.variable('b') ],
            },
            {
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 2 },
              pageSize: 100,
              requestTime: 20,
              canContainUndefs: false,
              variables: [ DF.variable('a'), DF.variable('b') ],
            },
            {
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 5 },
              pageSize: 100,
              requestTime: 30,
              canContainUndefs: false,
              variables: [ DF.variable('a'), DF.variable('b') ],
            },
          ],
        )).resolves.toEqual({
          iterations: 1.280_000_000_000_000_2,
          persistedItems: 0,
          blockingItems: 0,
          requestTime: 0.912_000_000_000_000_1,
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
                    canContainUndefs: false,
                  }),

                },
                operation: <any>{ type: Algebra.types.EXTEND },
              },
              {
                output: <any>{
                  metadata: () => Promise.resolve({
                    cardinality: { type: 'estimate', value: 2 },
                    canContainUndefs: false,
                  }),
                },
                operation: <any>{},
              },
            ],
            context: new ActionContext(),
          },
          [
            {
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 3 },
              pageSize: 100,
              requestTime: 10,
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
            {
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 2 },
              pageSize: 100,
              requestTime: 20,
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
          ],
        )).rejects.toThrow('Actor actor can not bind on Extend and Group operations');
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
          [
            {
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 3 },
              pageSize: 100,
              requestTime: 10,
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
            {
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 2 },
              pageSize: 100,
              requestTime: 20,
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
          ],
        )).rejects.toThrow('Actor actor can not bind on Extend and Group operations');
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
          [
            {
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 3 },
              pageSize: 100,
              requestTime: 10,
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
            {
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 2 },
              pageSize: 100,
              requestTime: 20,
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
          ],
        )).rejects.toThrow('Actor actor can not bind on Extend and Group operations');
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
          [
            {
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 3 },
              pageSize: 100,
              requestTime: 10,
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
            {
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 2 },
              pageSize: 100,
              requestTime: 20,
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
          ],
        )).resolves.toEqual({
          iterations: 0.480_000_000_000_000_1,
          persistedItems: 0,
          blockingItems: 0,
          requestTime: 0.448_000_000_000_000_06,
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
          [
            {
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 3 },
              pageSize: 100,
              requestTime: 10,
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
            {
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 2 },
              pageSize: 100,
              requestTime: 20,
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
          ],
        )).rejects.toThrow('Actor actor can not be used over remaining entries with modified operations');
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
                canContainUndefs: false,
                variables: [ DF.variable('a') ],
              },
            },
            {
              output: <any> {},
              operation: <any> {},
              metadata: {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 2 },
                canContainUndefs: false,
                variables: [ DF.variable('a') ],
              },
            },
          ],
          context,
        )).resolves.toEqual([
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 2 },
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
          },
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 3 },
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
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
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
          },
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 2 },
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
          },
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 5 },
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
          },
        ], context)).resolves.toEqual([
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 2 },
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
          },
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 3 },
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
          },
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 5 },
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
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
                canContainUndefs: false,
                variables: [ DF.variable('a') ],
              },
            },
            {
              output: <any> {},
              operation: <any> {},
              metadata: {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 3 },
                canContainUndefs: false,
                variables: [ DF.variable('a') ],
              },
            },
            {
              output: <any> {},
              operation: <any> {},
              metadata: {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 3 },
                canContainUndefs: false,
                variables: [ DF.variable('a') ],
              },
            },
          ],
          context,
        )).resolves.toEqual([
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 3 },
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
          },
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 3 },
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
          },
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 3 },
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
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
                canContainUndefs: false,
                variables: [ DF.variable('a') ],
              },
            },
            {
              output: <any> {},
              operation: <any> {},
              metadata: {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 2 },
                canContainUndefs: false,
                variables: [ DF.variable('a') ],
              },
            },
            {
              output: <any> {},
              operation: <any> {},
              metadata: {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 5 },
                canContainUndefs: true,
                variables: [ DF.variable('a') ],
              },
            },
          ],
          context,
        )).resolves.toEqual([
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 3 },
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
          },
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 2 },
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
          },
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 5 },
              canContainUndefs: true,
              variables: [ DF.variable('a') ],
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
                canContainUndefs: false,
                variables: [ DF.variable('a1'), DF.variable('b1') ],
              },
            },
            {
              output: <any> {},
              operation: <any> {},
              metadata: {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 2 },
                canContainUndefs: false,
                variables: [ DF.variable('a2'), DF.variable('b2') ],
              },
            },
          ],
          context,
        )).rejects.toThrow('Bind join can only join entries with at least one common variable');
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
                canContainUndefs: false,
                variables: [ DF.variable('b') ],
              },
            },
            {
              output: <any> {},
              operation: <any> {},
              metadata: {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 3 },
                canContainUndefs: false,
                variables: [ DF.variable('a') ],
              },
            },
            {
              output: <any> {},
              operation: <any> {},
              metadata: {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 2 },
                canContainUndefs: false,
                variables: [ DF.variable('a') ],
              },
            },
          ],
          context,
        )).resolves.toEqual([
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 2 },
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
          },
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 3 },
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
          },
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 1 },
              canContainUndefs: false,
              variables: [ DF.variable('b') ],
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
                canContainUndefs: false,
                variables: [ DF.variable('a') ],
              },
            },
            {
              output: <any> {},
              operation: <any> {},
              metadata: {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 1 },
                canContainUndefs: false,
                variables: [ DF.variable('b') ],
              },
            },
            {
              output: <any> {},
              operation: <any> {},
              metadata: {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 20 },
                canContainUndefs: false,
                variables: [ DF.variable('a') ],
              },
            },
            {
              output: <any> {},
              operation: <any> {},
              metadata: {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 20 },
                canContainUndefs: false,
                variables: [ DF.variable('c') ],
              },
            },
            {
              output: <any> {},
              operation: <any> {},
              metadata: {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 2 },
                canContainUndefs: false,
                variables: [ DF.variable('a') ],
              },
            },
            {
              output: <any> {},
              operation: <any> {},
              metadata: {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 10 },
                canContainUndefs: false,
                variables: [ DF.variable('d') ],
              },
            },
            {
              output: <any> {},
              operation: <any> {},
              metadata: {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 10 },
                canContainUndefs: false,
                variables: [ DF.variable('a') ],
              },
            },
          ],
          context,
        )).resolves.toEqual([
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 2 },
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
          },
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 3 },
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
          },
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 10 },
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
          },
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 20 },
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
          },
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 1 },
              canContainUndefs: false,
              variables: [ DF.variable('b') ],
            },
          },
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 10 },
              canContainUndefs: false,
              variables: [ DF.variable('d') ],
            },
          },
          {
            output: <any> {},
            operation: <any> {},
            metadata: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 20 },
              canContainUndefs: false,
              variables: [ DF.variable('c') ],
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
                  cardinality: { type: 'estimate', value: 3 },
                  canContainUndefs: false,
                  variables: [ DF.variable('a'), DF.variable('b') ],
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
                  canContainUndefs: false,
                  variables: [ DF.variable('a') ],
                }),
                type: 'bindings',
              },
              operation: FACTORY.createPattern(DF.variable('a'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
            },
          ],
        };
        const { result, physicalPlanMetadata } = await actor.getOutput(action);

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
          cardinality: { type: 'estimate', value: 2.400_000_000_000_000_4 },
          canContainUndefs: false,
          variables: [ DF.variable('a'), DF.variable('b') ],
        });

        // Validate physicalPlanMetadata
        expect(physicalPlanMetadata).toEqual({
          bindIndex: 1,
          bindOrder: 'depth-first',
        });

        // Validate mock calls
        expect(logSpy).toHaveBeenCalledWith(context, 'First entry for Bind Join: ', expect.any(Function));
        expect(logSpy.mock.calls[0][2]()).toEqual({
          entry: action.entries[1].operation,
          metadata: {
            state: expect.any(MetadataValidationState),
            cardinality: { type: 'estimate', value: 1 },
            canContainUndefs: false,
            variables: [ DF.variable('a') ],
          },
        });
        expect(mediatorQueryOperation.mediate).toHaveBeenCalledTimes(2);
        expect(mediatorQueryOperation.mediate).toHaveBeenNthCalledWith(1, {
          operation: FACTORY.createPattern(DF.namedNode('ex:a1'), DF.namedNode('ex:p1'), DF.variable('b')),
          context: new ActionContext({
            a: 'b',
            [KeysQueryOperation.joinLeftMetadata.name]: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 1 },
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
            [KeysQueryOperation.joinRightMetadatas.name]: [{
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 3 },
              canContainUndefs: false,
              variables: [ DF.variable('a'), DF.variable('b') ],
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
            [KeysQueryOperation.joinLeftMetadata.name]: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 1 },
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
            [KeysQueryOperation.joinRightMetadatas.name]: [{
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 3 },
              canContainUndefs: false,
              variables: [ DF.variable('a'), DF.variable('b') ],
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
                  cardinality: { type: 'estimate', value: 3 },
                  canContainUndefs: false,
                  variables: [ DF.variable('a'), DF.variable('b') ],
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
                  canContainUndefs: false,
                  variables: [ DF.variable('a') ],
                }),
                type: 'bindings',
              },
              operation: FACTORY.createPattern(DF.variable('a'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
            },
          ],
        };
        const { result } = await actor.getOutput(action);

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
          cardinality: { type: 'estimate', value: 2.400_000_000_000_000_4 },
          canContainUndefs: false,
          variables: [ DF.variable('a'), DF.variable('b') ],
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
                  cardinality: { type: 'estimate', value: 3 },
                  canContainUndefs: false,
                  variables: [ DF.variable('a'), DF.variable('b') ],
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
                  canContainUndefs: false,
                  variables: [ DF.variable('a') ],
                }),
                type: 'bindings',
              },
              operation: FACTORY.createPattern(DF.variable('a'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
            },
          ],
          context,
        };
        const { result } = await actor.getOutput(action);

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
          cardinality: { type: 'estimate', value: 2.400_000_000_000_000_4 },
          canContainUndefs: false,
          variables: [ DF.variable('a'), DF.variable('b') ],
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
                  cardinality: { type: 'estimate', value: 3 },
                  canContainUndefs: false,
                  variables: [ DF.variable('a'), DF.variable('b') ],
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
                  cardinality: { type: 'estimate', value: 4 },
                  canContainUndefs: false,
                  variables: [ DF.variable('a'), DF.variable('c') ],
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
                  canContainUndefs: false,
                  variables: [ DF.variable('a') ],
                }),
                type: 'bindings',
              },
              operation: FACTORY.createPattern(DF.variable('a'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
            },
          ],
        };
        const { result } = await actor.getOutput(action);

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
          cardinality: { type: 'estimate', value: 9.600_000_000_000_001 },
          canContainUndefs: false,
          variables: [ DF.variable('a'), DF.variable('b'), DF.variable('c') ],
        });

        // Validate mock calls
        expect(logSpy).toHaveBeenCalledWith(context, 'First entry for Bind Join: ', expect.any(Function));
        expect(logSpy.mock.calls[0][2]()).toEqual({
          entry: action.entries[2].operation,
          metadata: {
            state: expect.any(MetadataValidationState),
            cardinality: { type: 'estimate', value: 1 },
            canContainUndefs: false,
            variables: [ DF.variable('a') ],
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
            [KeysQueryOperation.joinLeftMetadata.name]: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 1 },
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
            [KeysQueryOperation.joinRightMetadatas.name]: [
              {
                state: expect.any(MetadataValidationState),
                cardinality: { type: 'estimate', value: 3 },
                canContainUndefs: false,
                variables: [ DF.variable('a'), DF.variable('b') ],
              },
              {
                state: expect.any(MetadataValidationState),
                cardinality: { type: 'estimate', value: 4 },
                canContainUndefs: false,
                variables: [ DF.variable('a'), DF.variable('c') ],
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
            [KeysQueryOperation.joinLeftMetadata.name]: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 1 },
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
            [KeysQueryOperation.joinRightMetadatas.name]: [
              {
                state: expect.any(MetadataValidationState),
                cardinality: { type: 'estimate', value: 3 },
                canContainUndefs: false,
                variables: [ DF.variable('a'), DF.variable('b') ],
              },
              {
                state: expect.any(MetadataValidationState),
                cardinality: { type: 'estimate', value: 4 },
                canContainUndefs: false,
                variables: [ DF.variable('a'), DF.variable('c') ],
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
