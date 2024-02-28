import { ActorRdfJoinNestedLoop } from '@comunica/actor-rdf-join-inner-nestedloop';
import { BindingsFactory } from '@comunica/bindings-factory';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import type { MediatorRdfJoin, IActionRdfJoin } from '@comunica/bus-rdf-join';
import type { IActionRdfJoinEntriesSort, MediatorRdfJoinEntriesSort } from '@comunica/bus-rdf-join-entries-sort';
import type { MediatorRdfJoinSelectivity } from '@comunica/bus-rdf-join-selectivity';
import { KeysRdfJoin } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { MetadataValidationState } from '@comunica/metadata';
import type { IActionContext, IQuerySourceWrapper, IJoinEntryWithMetadata } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator, AsyncIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Algebra, Factory } from 'sparqlalgebrajs';
import { ActorRdfJoinMultiSmallestFilterBindings } from '../lib/ActorRdfJoinMultiSmallestFilterBindings';
import '@comunica/jest';

const AF = new Factory();
const DF = new DataFactory();
const BF = new BindingsFactory();

describe('ActorRdfJoinMultiSmallestFilterBindings', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfJoinMultiSmallestFilterBindings instance', () => {
    let context: IActionContext;
    let invocationCounter: number;
    let mediatorJoinSelectivity: MediatorRdfJoinSelectivity;
    let mediatorJoinEntriesSort: MediatorRdfJoinEntriesSort;
    let mediatorJoin: MediatorRdfJoin;
    let actor: ActorRdfJoinMultiSmallestFilterBindings;
    let logSpy: jest.SpyInstance;
    let source1: IQuerySourceWrapper;
    let source2: IQuerySourceWrapper;
    let source3TriplePattern: IQuerySourceWrapper;
    let source4: IQuerySourceWrapper;
    let source5Context: IQuerySourceWrapper;

    beforeEach(() => {
      context = new ActionContext({ a: 'b' });
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
      invocationCounter = 0;
      mediatorJoin = <any> {
        mediate(a: any) {
          if (a.entries.length === 1) {
            return a.entries[0].output;
          }
          if (a.entries.length === 2) {
            a.entries[0].operation.called = invocationCounter;
            a.entries[1].operation.called = invocationCounter;
            invocationCounter++;
            return new ActorRdfJoinNestedLoop({ name: 'actor', bus, mediatorJoinSelectivity })
              .run(a);
          }
          return actor.run(a);
        },
      };
      actor = new ActorRdfJoinMultiSmallestFilterBindings({
        name: 'actor',
        bus,
        selectivityModifier: 0.000_1,
        blockSize: 2,
        mediatorJoin,
        mediatorJoinSelectivity,
        mediatorJoinEntriesSort,
      });
      logSpy = jest.spyOn((<any> actor), 'logDebug').mockImplementation();
      source1 = <IQuerySourceWrapper> <any> {
        source: {
          getSelectorShape() {
            return {
              type: 'operation',
              operation: { operationType: 'type', type: Algebra.types.PROJECT },
              filterBindings: true,
            };
          },
          queryBindings: jest.fn((operation: any, ctx: any, options: any) => {
            return options.filterBindings.bindings.transform({
              map(binding: RDF.Bindings): RDF.Bindings {
                return binding.merge(BF.bindings([
                  [ DF.variable('filtered'), DF.namedNode('ex:filtered') ],
                ]))!;
              },
              autoStart: false,
            });
          }),
        },
      };
      source2 = <IQuerySourceWrapper> <any> {
        source: {
          getSelectorShape() {
            return {
              type: 'operation',
              operation: { operationType: 'type', type: Algebra.types.PROJECT },
              filterBindings: true,
            };
          },
        },
      };
      source3TriplePattern = <IQuerySourceWrapper> <any> {
        source: {
          getSelectorShape() {
            return {
              type: 'operation',
              operation: { operationType: 'type', type: Algebra.types.PATTERN },
              filterBindings: true,
            };
          },
        },
      };
      source4 = <IQuerySourceWrapper> <any> {
        source: {
          getSelectorShape() {
            return {
              type: 'operation',
              operation: { operationType: 'type', type: Algebra.types.PROJECT },
            };
          },
          queryBindings: jest.fn((operation: any, ctx: any, options: any) => {
            return options.joinBindings.bindings.transform({
              map(binding: RDF.Bindings): RDF.Bindings {
                return binding.merge(BF.bindings([
                  [ DF.variable('bound'), DF.namedNode('ex:bound') ],
                ]))!;
              },
              autoStart: false,
            });
          }),
        },
      };
      source5Context = <IQuerySourceWrapper> <any> {
        source: {
          getSelectorShape() {
            return {
              type: 'operation',
              operation: { operationType: 'type', type: Algebra.types.PROJECT },
              filterBindings: true,
            };
          },
          queryBindings: jest.fn((operation: any, ctx: any, options: any) => {
            return options.filterBindings.bindings.transform({
              map(binding: RDF.Bindings): RDF.Bindings {
                return binding.merge(BF.bindings([
                  [ DF.variable('filtered'), DF.namedNode('ex:filtered') ],
                ]))!;
              },
              autoStart: false,
            });
          }),
        },
        context: new ActionContext({ x: 'y' }),
      };
    });

    describe('sortJoinEntries', () => {
      it('should handle 3 entries', async() => {
        const e1: IJoinEntryWithMetadata = {
          output: <any>{},
          operation: ActorQueryOperation.assignOperationSource(AF.createNop(), source1),
          metadata: {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: 3 },
            pageSize: 100,
            requestTime: 10,
            canContainUndefs: false,
            variables: [ DF.variable('a') ],
          },
        };
        const e2: IJoinEntryWithMetadata = {
          output: <any>{},
          operation: ActorQueryOperation.assignOperationSource(AF.createNop(), source1),
          metadata: {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: 5 },
            pageSize: 100,
            requestTime: 10,
            canContainUndefs: false,
            variables: [ DF.variable('a') ],
          },
        };
        const e3: IJoinEntryWithMetadata = {
          output: <any>{},
          operation: ActorQueryOperation.assignOperationSource(AF.createNop(), source1),
          metadata: {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: 1 },
            pageSize: 100,
            requestTime: 10,
            canContainUndefs: false,
            variables: [ DF.variable('a') ],
          },
        };
        await expect(actor.sortJoinEntries([ e1, e2, e3 ], context)).resolves.toEqual({
          first: e3,
          second: e1,
          remaining: [ e2 ],
        });
      });

      it('should prioritize modified operations', async() => {
        const e1: IJoinEntryWithMetadata = {
          output: <any>{},
          operation: ActorQueryOperation.assignOperationSource(AF.createNop(), source1),
          metadata: {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: 3 },
            pageSize: 100,
            requestTime: 10,
            canContainUndefs: false,
            variables: [ DF.variable('a') ],
          },
        };
        const e2: IJoinEntryWithMetadata = {
          output: <any>{},
          operation: ActorQueryOperation.assignOperationSource(AF.createNop(), source1),
          metadata: {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: 5 },
            pageSize: 100,
            requestTime: 10,
            canContainUndefs: false,
            variables: [ DF.variable('a') ],
          },
          operationModified: true,
        };
        const e3: IJoinEntryWithMetadata = {
          output: <any>{},
          operation: ActorQueryOperation.assignOperationSource(AF.createNop(), source1),
          metadata: {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: 1 },
            pageSize: 100,
            requestTime: 10,
            canContainUndefs: false,
            variables: [ DF.variable('a') ],
          },
        };
        await expect(actor.sortJoinEntries([ e1, e2, e3 ], context)).resolves.toEqual({
          first: e2,
          second: e3,
          remaining: [ e1 ],
        });
      });

      it('should prioritize shared variables for the second entry', async() => {
        const e1: IJoinEntryWithMetadata = {
          output: <any>{},
          operation: ActorQueryOperation.assignOperationSource(AF.createNop(), source1),
          metadata: {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: 5 },
            pageSize: 100,
            requestTime: 10,
            canContainUndefs: false,
            variables: [ DF.variable('a') ],
          },
        };
        const e2: IJoinEntryWithMetadata = {
          output: <any>{},
          operation: ActorQueryOperation.assignOperationSource(AF.createNop(), source1),
          metadata: {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: 3 },
            pageSize: 100,
            requestTime: 10,
            canContainUndefs: false,
            variables: [ DF.variable('b') ],
          },
        };
        const e3: IJoinEntryWithMetadata = {
          output: <any>{},
          operation: ActorQueryOperation.assignOperationSource(AF.createNop(), source1),
          metadata: {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: 1 },
            pageSize: 100,
            requestTime: 10,
            canContainUndefs: false,
            variables: [ DF.variable('a') ],
          },
        };
        await expect(actor.sortJoinEntries([ e1, e2, e3 ], context)).resolves.toEqual({
          first: e3,
          second: e1,
          remaining: [ e2 ],
        });
      });

      it('should prioritize fewest variables for the second entry', async() => {
        const e1: IJoinEntryWithMetadata = {
          output: <any>{},
          operation: ActorQueryOperation.assignOperationSource(AF.createNop(), source1),
          metadata: {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: 3 },
            pageSize: 100,
            requestTime: 10,
            canContainUndefs: false,
            variables: [ DF.variable('a') ],
          },
        };
        const e2: IJoinEntryWithMetadata = {
          output: <any>{},
          operation: ActorQueryOperation.assignOperationSource(AF.createNop(), source1),
          metadata: {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: 3 },
            pageSize: 100,
            requestTime: 10,
            canContainUndefs: false,
            variables: [ DF.variable('a'), DF.variable('b') ],
          },
        };
        const e3: IJoinEntryWithMetadata = {
          output: <any>{},
          operation: ActorQueryOperation.assignOperationSource(AF.createNop(), source1),
          metadata: {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: 1 },
            pageSize: 100,
            requestTime: 10,
            canContainUndefs: false,
            variables: [ DF.variable('a') ],
          },
        };
        await expect(actor.sortJoinEntries([ e1, e2, e3 ], context)).resolves.toEqual({
          first: e3,
          second: e1,
          remaining: [ e2 ],
        });
      });

      it('should prioritize shared variables over fewest variables for the second entry', async() => {
        const e1: IJoinEntryWithMetadata = {
          output: <any>{},
          operation: ActorQueryOperation.assignOperationSource(AF.createNop(), source1),
          metadata: {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: 3 },
            pageSize: 100,
            requestTime: 10,
            canContainUndefs: false,
            variables: [ DF.variable('a'), DF.variable('b'), DF.variable('c') ],
          },
        };
        const e2: IJoinEntryWithMetadata = {
          output: <any>{},
          operation: ActorQueryOperation.assignOperationSource(AF.createNop(), source1),
          metadata: {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: 3 },
            pageSize: 100,
            requestTime: 10,
            canContainUndefs: false,
            variables: [ DF.variable('a'), DF.variable('b'), DF.variable('c'), DF.variable('d') ],
          },
        };
        const e3: IJoinEntryWithMetadata = {
          output: <any>{},
          operation: ActorQueryOperation.assignOperationSource(AF.createNop(), source1),
          metadata: {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: 1 },
            pageSize: 100,
            requestTime: 10,
            canContainUndefs: false,
            variables: [ DF.variable('a'), DF.variable('b') ],
          },
        };
        await expect(actor.sortJoinEntries([ e1, e2, e3 ], context)).resolves.toEqual({
          first: e3,
          second: e1,
          remaining: [ e2 ],
        });
      });

      it('should throw for no shared variables for the second entry', async() => {
        const e1: IJoinEntryWithMetadata = {
          output: <any>{},
          operation: ActorQueryOperation.assignOperationSource(AF.createNop(), source1),
          metadata: {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: 3 },
            pageSize: 100,
            requestTime: 10,
            canContainUndefs: false,
            variables: [ DF.variable('c') ],
          },
        };
        const e2: IJoinEntryWithMetadata = {
          output: <any>{},
          operation: ActorQueryOperation.assignOperationSource(AF.createNop(), source1),
          metadata: {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: 3 },
            pageSize: 100,
            requestTime: 10,
            canContainUndefs: false,
            variables: [ DF.variable('d') ],
          },
        };
        const e3: IJoinEntryWithMetadata = {
          output: <any>{},
          operation: ActorQueryOperation.assignOperationSource(AF.createNop(), source1),
          metadata: {
            state: new MetadataValidationState(),
            cardinality: { type: 'estimate', value: 1 },
            pageSize: 100,
            requestTime: 10,
            canContainUndefs: false,
            variables: [ DF.variable('a'), DF.variable('b') ],
          },
        };
        await expect(actor.sortJoinEntries([ e1, e2, e3 ], context)).rejects
          .toThrow(`Actor actor can only join with common variables`);
      });
    });

    describe('getOutput', () => {
      it('should handle two entries', async() => {
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
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 2 },
                  canContainUndefs: false,
                  variables: [ DF.variable('a'), DF.variable('b') ],
                }),
                type: 'bindings',
              },
              operation: ActorQueryOperation.assignOperationSource(
                AF.createPattern(DF.variable('a'), DF.namedNode('ex:p1'), DF.variable('b')),
                source1,
              ),
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([
                    [ DF.variable('a'), DF.namedNode('ex:a1') ],
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
              operation: AF.createPattern(DF.variable('a'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
            },
          ],
        };
        const { result, physicalPlanMetadata } = await actor.getOutput(action);

        // Validate output
        expect(result.type).toBe('bindings');
        await expect(result.bindingsStream).toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('filtered'), DF.namedNode('ex:filtered') ],
            [ DF.variable('a'), DF.namedNode('ex:a1') ],
          ]),
        ]);
        await expect(result.metadata()).resolves.toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: 1.6 },
          canContainUndefs: false,
          variables: [ DF.variable('a'), DF.variable('b') ],
        });

        // Validate physicalPlanMetadata
        expect(physicalPlanMetadata).toEqual({
          firstIndex: 1,
          secondIndex: 0,
        });

        // Validate mock calls
        expect(source1.source.queryBindings).toHaveBeenCalledTimes(1);
        expect(source1.source.queryBindings).toHaveBeenNthCalledWith(
          1,
          action.entries[0].operation,
          context,
          {
            filterBindings: {
              bindings: expect.any(AsyncIterator),
              metadata: expect.anything(),
            },
          },
        );
      });

      it('should handle two entries with source context', async() => {
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
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 2 },
                  canContainUndefs: false,
                  variables: [ DF.variable('a'), DF.variable('b') ],
                }),
                type: 'bindings',
              },
              operation: ActorQueryOperation.assignOperationSource(
                AF.createPattern(DF.variable('a'), DF.namedNode('ex:p1'), DF.variable('b')),
                source5Context,
              ),
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([
                    [ DF.variable('a'), DF.namedNode('ex:a1') ],
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
              operation: AF.createPattern(DF.variable('a'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
            },
          ],
        };
        const { result, physicalPlanMetadata } = await actor.getOutput(action);

        // Validate output
        expect(result.type).toBe('bindings');
        await expect(result.bindingsStream).toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('filtered'), DF.namedNode('ex:filtered') ],
            [ DF.variable('a'), DF.namedNode('ex:a1') ],
          ]),
        ]);
        await expect(result.metadata()).resolves.toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: 1.6 },
          canContainUndefs: false,
          variables: [ DF.variable('a'), DF.variable('b') ],
        });

        // Validate physicalPlanMetadata
        expect(physicalPlanMetadata).toEqual({
          firstIndex: 1,
          secondIndex: 0,
        });

        // Validate mock calls
        expect(source5Context.source.queryBindings).toHaveBeenCalledTimes(1);
        expect(source5Context.source.queryBindings).toHaveBeenNthCalledWith(
          1,
          action.entries[0].operation,
          context.merge(new ActionContext({ x: 'y' })),
          {
            filterBindings: {
              bindings: expect.any(AsyncIterator),
              metadata: expect.anything(),
            },
          },
        );
      });
    });

    describe('getJoinCoefficients', () => {
      it('should handle three entries', async() => {
        await expect(actor.getJoinCoefficients(
          {
            type: 'inner',
            entries: [
              {
                output: <any>{},
                operation: ActorQueryOperation.assignOperationSource(AF.createNop(), source1),
              },
              {
                output: <any>{},
                operation: AF.createNop(),
              },
              {
                output: <any>{},
                operation: ActorQueryOperation.assignOperationSource(AF.createNop(), source1),
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
          iterations: 1.200_000_000_000_000_2e-7,
          persistedItems: 2,
          blockingItems: 2,
          requestTime: 0.400_05,
        });
      });

      it('throws if lastPhysicalJoin is set to the same physical name', async() => {
        await expect(actor.getJoinCoefficients(
          {
            type: 'inner',
            entries: [
              {
                output: <any>{},
                operation: ActorQueryOperation.assignOperationSource(AF.createNop(), source1),
              },
              {
                output: <any>{},
                operation: AF.createNop(),
              },
              {
                output: <any>{},
                operation: ActorQueryOperation.assignOperationSource(AF.createNop(), source1),
              },
            ],
            context: new ActionContext()
              .set(KeysRdfJoin.lastPhysicalJoin, 'multi-smallest-filter-bindings'),
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
        )).rejects.toThrow(`Actor actor can not be called recursively`);
      });

      it('throws if entries[1] has no source', async() => {
        await expect(actor.getJoinCoefficients(
          {
            type: 'inner',
            entries: [
              {
                output: <any>{},
                operation: AF.createNop(),
              },
              {
                output: <any>{},
                operation: AF.createNop(),
              },
              {
                output: <any>{},
                operation: ActorQueryOperation.assignOperationSource(AF.createNop(), source1),
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
        )).rejects.toThrow(`Actor actor can only process if entries[1] has a source`);
      });

      it('throws if the entries[1] source accepts no filterBindings', async() => {
        await expect(actor.getJoinCoefficients(
          {
            type: 'inner',
            entries: [
              {
                output: <any>{},
                operation: ActorQueryOperation.assignOperationSource(AF.createNop(), source4),
              },
              {
                output: <any>{},
                operation: AF.createNop(),
              },
              {
                output: <any>{},
                operation: ActorQueryOperation.assignOperationSource(AF.createNop(), source1),
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
        )).rejects.toThrow(`Actor actor can only process if entries[1] accept filterBindings`);
      });
    });
  });
});
