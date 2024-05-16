import { BindingsFactory } from '@comunica/bindings-factory';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import type { IActionRdfJoinEntriesSort, MediatorRdfJoinEntriesSort } from '@comunica/bus-rdf-join-entries-sort';
import type { MediatorRdfJoinSelectivity } from '@comunica/bus-rdf-join-selectivity';
import { ActionContext, Bus } from '@comunica/core';
import { MetadataValidationState } from '@comunica/metadata';
import type { IQuerySourceWrapper, IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator, AsyncIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Algebra, Factory } from 'sparqlalgebrajs';
import { ActorRdfJoinMultiBindSource } from '../lib/ActorRdfJoinMultiBindSource';
import '@comunica/jest';

const AF = new Factory();
const DF = new DataFactory();
const BF = new BindingsFactory();

describe('ActorRdfJoinMultiBindSource', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfJoinMultiBindSource instance', () => {
    let context: IActionContext;
    let mediatorJoinSelectivity: MediatorRdfJoinSelectivity;
    let mediatorJoinEntriesSort: MediatorRdfJoinEntriesSort;
    let actor: ActorRdfJoinMultiBindSource;
    let logSpy: jest.SpyInstance;
    let source1: IQuerySourceWrapper;
    let source2: IQuerySourceWrapper;
    let source3TriplePattern: IQuerySourceWrapper;
    let source4Context: IQuerySourceWrapper;

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
      actor = new ActorRdfJoinMultiBindSource({
        name: 'actor',
        bus,
        selectivityModifier: 0.000_1,
        blockSize: 2,
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
              joinBindings: true,
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
      source2 = <IQuerySourceWrapper> <any> {
        source: {
          getSelectorShape() {
            return {
              type: 'operation',
              operation: { operationType: 'type', type: Algebra.types.PROJECT },
              joinBindings: true,
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
              joinBindings: true,
            };
          },
        },
      };
      source4Context = <IQuerySourceWrapper> <any> {
        source: {
          getSelectorShape() {
            return {
              type: 'operation',
              operation: { operationType: 'type', type: Algebra.types.PROJECT },
              joinBindings: true,
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
        context: new ActionContext({ x: 'y' }),
      };
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
                  BF.bindings([
                    [ DF.variable('b'), DF.namedNode('ex:b3') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('b'), DF.namedNode('ex:b4') ],
                  ]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 4 },
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
                  BF.bindings([
                    [ DF.variable('a'), DF.namedNode('ex:a2') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('a'), DF.namedNode('ex:a3') ],
                  ]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 3 },
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
            [ DF.variable('bound'), DF.namedNode('ex:bound') ],
            [ DF.variable('a'), DF.namedNode('ex:a1') ],
          ]),
          BF.bindings([
            [ DF.variable('bound'), DF.namedNode('ex:bound') ],
            [ DF.variable('a'), DF.namedNode('ex:a2') ],
          ]),
          BF.bindings([
            [ DF.variable('bound'), DF.namedNode('ex:bound') ],
            [ DF.variable('a'), DF.namedNode('ex:a3') ],
          ]),
        ]);
        await expect(result.metadata()).resolves.toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: 9.600_000_000_000_001 },
          canContainUndefs: false,
          variables: [ DF.variable('a'), DF.variable('b') ],
        });

        // Validate physicalPlanMetadata
        expect(physicalPlanMetadata).toEqual({
          bindIndex: 1,
        });

        // Validate mock calls
        expect(logSpy).toHaveBeenCalledWith(context, 'First entry for Bind Join Source: ', expect.any(Function));
        expect(logSpy.mock.calls[0][2]()).toEqual({
          entry: action.entries[1].operation,
          metadata: {
            state: expect.any(MetadataValidationState),
            cardinality: { type: 'estimate', value: 3 },
            canContainUndefs: false,
            variables: [ DF.variable('a') ],
          },
        });
        expect(source1.source.queryBindings).toHaveBeenCalledTimes(2);
        expect(source1.source.queryBindings).toHaveBeenNthCalledWith(
          1,
          action.entries[0].operation,
          context,
          {
            joinBindings: {
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
                  BF.bindings([
                    [ DF.variable('b'), DF.namedNode('ex:b3') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('b'), DF.namedNode('ex:b4') ],
                  ]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 4 },
                  canContainUndefs: false,
                  variables: [ DF.variable('a'), DF.variable('b') ],
                }),
                type: 'bindings',
              },
              operation: ActorQueryOperation.assignOperationSource(
                AF.createPattern(DF.variable('a'), DF.namedNode('ex:p1'), DF.variable('b')),
                source4Context,
              ),
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
                  BF.bindings([
                    [ DF.variable('a'), DF.namedNode('ex:a3') ],
                  ]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 3 },
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
            [ DF.variable('bound'), DF.namedNode('ex:bound') ],
            [ DF.variable('a'), DF.namedNode('ex:a1') ],
          ]),
          BF.bindings([
            [ DF.variable('bound'), DF.namedNode('ex:bound') ],
            [ DF.variable('a'), DF.namedNode('ex:a2') ],
          ]),
          BF.bindings([
            [ DF.variable('bound'), DF.namedNode('ex:bound') ],
            [ DF.variable('a'), DF.namedNode('ex:a3') ],
          ]),
        ]);
        await expect(result.metadata()).resolves.toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: 9.600_000_000_000_001 },
          canContainUndefs: false,
          variables: [ DF.variable('a'), DF.variable('b') ],
        });

        // Validate physicalPlanMetadata
        expect(physicalPlanMetadata).toEqual({
          bindIndex: 1,
        });

        // Validate mock calls
        expect(logSpy).toHaveBeenCalledWith(context, 'First entry for Bind Join Source: ', expect.any(Function));
        expect(logSpy.mock.calls[0][2]()).toEqual({
          entry: action.entries[1].operation,
          metadata: {
            state: expect.any(MetadataValidationState),
            cardinality: { type: 'estimate', value: 3 },
            canContainUndefs: false,
            variables: [ DF.variable('a') ],
          },
        });
        expect(source4Context.source.queryBindings).toHaveBeenCalledTimes(2);
        expect(source4Context.source.queryBindings).toHaveBeenNthCalledWith(
          1,
          action.entries[0].operation,
          context.merge(new ActionContext({ x: 'y' })),
          {
            joinBindings: {
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
          iterations: 1,
          persistedItems: 2,
          blockingItems: 2,
          requestTime: 0.400_064_000_000_000_03,
        });
      });

      it('should handle three entries and prioritize modified operations', async() => {
        await expect(actor.getJoinCoefficients(
          {
            type: 'inner',
            entries: [
              {
                output: <any>{},
                operation: ActorQueryOperation.assignOperationSource(AF.createNop(), source1),
                operationModified: true,
              },
              {
                output: <any>{},
                operation: ActorQueryOperation.assignOperationSource(AF.createNop(), source1),
              },
              {
                output: <any>{},
                operation: ActorQueryOperation.assignOperationSource(AF.createNop(), source1),
                operationModified: true,
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
          iterations: 1,
          persistedItems: 3,
          blockingItems: 3,
          requestTime: 0.300_168_000_000_000_05,
        });
      });

      it('should reject when a remaining entry does not have a source', async() => {
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
                operation: AF.createNop(),
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
        )).rejects.toThrow('Actor actor can not bind on remaining operations without source annotation');
      });

      it('should reject when remaining entries have unequal sources', async() => {
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
                operation: ActorQueryOperation.assignOperationSource(AF.createNop(), source2),
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
        )).rejects.toThrow('Actor actor can not bind on remaining operations with non-equal source annotation');
      });

      it('should reject when remaining entries do not accept the operation', async() => {
        await expect(actor.getJoinCoefficients(
          {
            type: 'inner',
            entries: [
              {
                output: <any>{},
                operation: ActorQueryOperation.assignOperationSource(AF.createNop(), source3TriplePattern),
              },
              {
                output: <any>{},
                operation: AF.createNop(),
              },
              {
                output: <any>{},
                operation: ActorQueryOperation.assignOperationSource(AF.createNop(), source3TriplePattern),
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
        )).rejects.toThrow('Actor actor detected a source that can not handle passing down join bindings');
      });
    });

    describe('createOperationFromEntries', () => {
      it('handles a single entry', () => {
        const op = AF.createNop();
        expect(actor.createOperationFromEntries([ <any>{ operation: op } ])).toBe(op);
      });

      it('handles multiple entries by joining', () => {
        const op = AF.createNop();
        expect(actor.createOperationFromEntries([ <any>{ operation: op } ])).toBe(op);
      });
    });
  });
});
