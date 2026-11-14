import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import type { IActionRdfJoinEntriesSort, MediatorRdfJoinEntriesSort } from '@comunica/bus-rdf-join-entries-sort';
import type { MediatorRdfJoinSelectivity } from '@comunica/bus-rdf-join-selectivity';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IQuerySourceWrapper, IActionContext } from '@comunica/types';
import { Algebra, AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import { assignOperationSource } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator, AsyncIterator, TransformIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import type {
  IActorRdfJoinMultiBindSourceTestSideData,
} from '../lib/ActorRdfJoinMultiBindSource';
import {
  ActorRdfJoinMultiBindSource,
} from '../lib/ActorRdfJoinMultiBindSource';
import '@comunica/utils-jest';

const AF = new AlgebraFactory();
const DF = new DataFactory();
const BF = new BindingsFactory(DF);

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
      context = new ActionContext({ a: 'b', [KeysInitQuery.dataFactory.name]: DF });
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
              operation: { operationType: 'wildcard' },
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
              operation: { operationType: 'wildcard' },
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
              operation: { operationType: 'type', type: Algebra.Types.PATTERN },
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
              operation: { operationType: 'wildcard' },
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

    async function getSideData(action: IActionRdfJoin): Promise<IActorRdfJoinMultiBindSourceTestSideData> {
      return (await actor.test(action)).getSideData();
    }

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
                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                    { variable: DF.variable('b'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: assignOperationSource(
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
                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: AF.createPattern(DF.variable('a'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
            },
          ],
        };
        const { result, physicalPlanMetadata } = await actor.getOutput(action, await getSideData(action));

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
        ], true);
        await expect(result.metadata()).resolves.toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: 3 },
          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
            { variable: DF.variable('b'), canBeUndef: false },
          ],
        });

        // Validate physicalPlanMetadata
        expect(physicalPlanMetadata).toEqual({
          bindIndex: 1,
        });

        // Validate mock calls
        expect(logSpy).toHaveBeenCalledWith(context, 'First entry for Bind Join Source: ', expect.any(Function));
        expect(logSpy.mock.calls[0][2]()).toEqual({
          entry: action.entries[1].operation,
          cardinality: { type: 'estimate', value: 3 },
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

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                    { variable: DF.variable('b'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: assignOperationSource(
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

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: AF.createPattern(DF.variable('a'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
            },
          ],
        };
        const { result, physicalPlanMetadata } = await actor.getOutput(action, await getSideData(action));

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
        ], true);
        await expect(result.metadata()).resolves.toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: 3 },

          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
            { variable: DF.variable('b'), canBeUndef: false },
          ],
        });

        // Validate physicalPlanMetadata
        expect(physicalPlanMetadata).toEqual({
          bindIndex: 1,
        });

        // Validate mock calls
        expect(logSpy).toHaveBeenCalledWith(context, 'First entry for Bind Join Source: ', expect.any(Function));
        expect(logSpy.mock.calls[0][2]()).toEqual({
          entry: action.entries[1].operation,
          cardinality: { type: 'estimate', value: 3 },
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
                operation: assignOperationSource(AF.createNop(), source1),
              },
              {
                output: <any>{},
                operation: AF.createNop(),
              },
              {
                output: <any>{},
                operation: assignOperationSource(AF.createNop(), source1),
              },
            ],
            context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
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
        )).resolves.toPassTest({
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
                operation: assignOperationSource(AF.createNop(), source1),
                operationModified: true,
              },
              {
                output: <any>{},
                operation: assignOperationSource(AF.createNop(), source1),
              },
              {
                output: <any>{},
                operation: assignOperationSource(AF.createNop(), source1),
                operationModified: true,
              },
            ],
            context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
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
        )).resolves.toPassTest({
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
                operation: assignOperationSource(AF.createNop(), source1),
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
            context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
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
        )).resolves.toFailTest('Actor actor can not bind on remaining operations without source annotation');
      });

      it('should reject when remaining entries have unequal sources', async() => {
        await expect(actor.getJoinCoefficients(
          {
            type: 'inner',
            entries: [
              {
                output: <any>{},
                operation: assignOperationSource(AF.createNop(), source1),
              },
              {
                output: <any>{},
                operation: AF.createNop(),
              },
              {
                output: <any>{},
                operation: assignOperationSource(AF.createNop(), source2),
              },
            ],
            context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
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
        )).resolves.toFailTest('Actor actor can not bind on remaining operations with non-equal source annotation');
      });

      it('should reject when remaining entries do not accept the operation', async() => {
        await expect(actor.getJoinCoefficients(
          {
            type: 'inner',
            entries: [
              {
                output: <any>{},
                operation: assignOperationSource(AF.createNop(), source3TriplePattern),
              },
              {
                output: <any>{},
                operation: AF.createNop(),
              },
              {
                output: <any>{},
                operation: assignOperationSource(AF.createNop(), source3TriplePattern),
              },
            ],
            context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
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
        )).resolves.toFailTest('Actor actor detected a source that can not handle passing down join bindings');
      });
    });

    describe('getBindTargets', () => {
      it('returns the operation if it has a source', () => {
        const op = assignOperationSource(AF.createNop(), source1);
        expect(ActorRdfJoinMultiBindSource.getBindTargets(op)).toEqual([{ sourceWrapper: source1, operation: op }]);
      });

      it('returns the inputs of a union if they all have a source', () => {
        const op1 = assignOperationSource(AF.createNop(), source1);
        const op2 = assignOperationSource(AF.createNop(), source2);
        expect(ActorRdfJoinMultiBindSource.getBindTargets(AF.createUnion([ op1, op2 ]))).toEqual([
          { sourceWrapper: source1, operation: op1 },
          { sourceWrapper: source2, operation: op2 },
        ]);
      });

      it('returns undefined for a union with an input without source', () => {
        const op1 = assignOperationSource(AF.createNop(), source1);
        expect(ActorRdfJoinMultiBindSource.getBindTargets(AF.createUnion([ op1, AF.createNop() ]))).toBeUndefined();
      });

      it('returns undefined for another operation without source', () => {
        expect(ActorRdfJoinMultiBindSource.getBindTargets(AF.createNop())).toBeUndefined();
      });
    });

    describe('queryTarget', () => {
      let calls: RDF.Bindings[][];
      let sourceRecording: IQuerySourceWrapper;
      const operation = AF.createPattern(DF.variable('a'), DF.namedNode('ex:p'), DF.variable('c'));
      const metadata: any = { variables: []};

      beforeEach(() => {
        calls = [];
        sourceRecording = <IQuerySourceWrapper> <any> {
          source: {
            queryBindings: jest.fn((op: any, ctx: any, options: any) => new TransformIterator(async() => {
              const bindings: RDF.Bindings[] = await options.joinBindings.bindings.toArray();
              calls.push(bindings);
              return new ArrayIterator(
                bindings.map(binding => binding.set(DF.variable('c'), DF.literal('c'))),
                { autoStart: false },
              );
            }, { autoStart: false })),
          },
        };
      });

      it('skips bindings with blank nodes for variables of the operation, and passes others as IRIs', async() => {
        const bindings = [
          BF.bindings([[ DF.variable('a'), DF.blankNode('a') ]]),
          BF.bindings([
            [ DF.variable('a'), DF.namedNode('ex:a1') ],
            [ DF.variable('x'), DF.blankNode('x') ],
          ]),
          BF.bindings([[ DF.variable('a'), DF.namedNode('ex:a2') ]]),
        ];
        await expect(actor.queryTarget({ sourceWrapper: sourceRecording, operation }, bindings, metadata, context, DF))
          .toEqualBindingsStream([
            BF.bindings([
              [ DF.variable('a'), DF.namedNode('ex:a1') ],
              [ DF.variable('x'), DF.blankNode('x') ],
              [ DF.variable('c'), DF.literal('c') ],
            ]),
            BF.bindings([
              [ DF.variable('a'), DF.namedNode('ex:a2') ],
              [ DF.variable('c'), DF.literal('c') ],
            ]),
          ]);
        expect(calls).toHaveLength(1);
        expect(calls[0]).toHaveLength(2);
        expect(calls[0][0].get(DF.variable('x')))
          .toEqual(DF.namedNode(`${ActorRdfJoinMultiBindSource.BLANK_NODE_IRI_PREFIX}0`));
      });

      it('does not query if all bindings have blank nodes for variables of the operation', async() => {
        const bindings = [
          BF.bindings([[ DF.variable('a'), DF.blankNode('a') ]]),
        ];
        await expect(actor.queryTarget({ sourceWrapper: sourceRecording, operation }, bindings, metadata, context, DF))
          .toEqualBindingsStream([]);
        expect(sourceRecording.source.queryBindings).not.toHaveBeenCalled();
      });
    });

    describe('with a join mediator', () => {
      let mediatorJoin: any;
      let sourceOther: IQuerySourceWrapper;

      function meta(cardinality: number, variables: string[]): any {
        return {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: cardinality },
          variables: variables.map(variable => ({ variable: DF.variable(variable), canBeUndef: false })),
        };
      }

      function makeActor(minMaxCardinalityRatio?: number): ActorRdfJoinMultiBindSource {
        return new ActorRdfJoinMultiBindSource({
          name: 'actor',
          bus,
          selectivityModifier: 0.000_1,
          blockSize: 2,
          minMaxCardinalityRatio,
          mediatorJoinSelectivity,
          mediatorJoinEntriesSort,
          mediatorJoin,
        });
      }

      beforeEach(() => {
        mediatorJoin = {
          mediate: jest.fn(async(action: IActionRdfJoin) => ({
            type: 'bindings',
            bindingsStream: action.entries[0].output.bindingsStream,
            metadata: action.entries[0].output.metadata,
          })),
        };
        sourceOther = <IQuerySourceWrapper> <any> {
          source: {
            getSelectorShape() {
              return {
                type: 'operation',
                operation: { operationType: 'wildcard' },
                joinBindings: true,
              };
            },
            queryBindings: jest.fn((operation: any, ctx: any, options: any) => {
              return options.joinBindings.bindings.map((binding: RDF.Bindings) =>
                binding.set(DF.variable('bound'), DF.namedNode('ex:bound-other')));
            }),
          },
        };
      });

      describe('getJoinCoefficients', () => {
        const left = AF.createPattern(DF.variable('a'), DF.namedNode('ex:p'), DF.namedNode('ex:o'));
        const unionInput1 = AF.createPattern(DF.variable('a'), DF.namedNode('ex:p'), DF.variable('c'));
        const unionInput2 = AF.createPattern(DF.variable('a'), DF.namedNode('ex:p'), DF.variable('c'));
        const other = AF.createPattern(DF.variable('d'), DF.namedNode('ex:q'), DF.namedNode('ex:o'));

        function getAction(): IActionRdfJoin {
          return {
            type: 'inner',
            entries: [
              {
                output: <any>{},
                operation: assignOperationSource(left, source2),
              },
              {
                output: <any>{},
                operation: AF.createUnion([
                  assignOperationSource(unionInput1, source1),
                  assignOperationSource(unionInput2, sourceOther),
                ]),
              },
              {
                output: <any>{},
                operation: assignOperationSource(other, source1),
              },
            ],
            context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
          };
        }

        it('binds on the first remaining operation that shares a variable', async() => {
          const action = getAction();
          const result = await makeActor().getJoinCoefficients(action, {
            metadatas: [ meta(2, [ 'a' ]), meta(200, [ 'a', 'c' ]), meta(300, [ 'd' ]) ],
          });
          expect(result).toPassTest({
            iterations: 1,
            persistedItems: 2,
            blockingItems: 2,
            requestTime: 0,
          });
          const sideData = result.getSideData();
          expect(sideData.bindIndex).toBe(0);
          const unionInputs = (<Algebra.Union> action.entries[1].operation).input;
          expect(sideData.targets).toHaveLength(2);
          expect(sideData.targets[0].sourceWrapper).toBe(source1);
          expect(sideData.targets[0].operation).toBe(unionInputs[0]);
          expect(sideData.targets[1].sourceWrapper).toBe(sourceOther);
          expect(sideData.targets[1].operation).toBe(unionInputs[1]);
        });

        it('skips remaining operations that do not share a variable', async() => {
          const action = getAction();
          const result = await makeActor().getJoinCoefficients(action, {
            metadatas: [ meta(2, [ 'a' ]), meta(400, [ 'a', 'c' ]), meta(300, [ 'd' ]) ],
          });
          expect(result.getSideData().bindIndex).toBe(1);
        });

        it('rejects if no remaining operation with sources shares a variable', async() => {
          const action = getAction();
          action.entries[1].operation = AF.createUnion([
            assignOperationSource(unionInput1, source1),
            unionInput2,
          ]);
          await expect(makeActor().getJoinCoefficients(action, {
            metadatas: [ meta(2, [ 'a' ]), meta(200, [ 'a', 'c' ]), meta(300, [ 'd' ]) ],
          })).resolves.toFailTest(
            'Actor actor found no remaining operation with sources that shares variables to bind on',
          );
        });

        it('rejects if the smallest stream is not much smaller than the largest stream', async() => {
          await expect(makeActor().getJoinCoefficients(getAction(), {
            metadatas: [ meta(10, [ 'a' ]), meta(200, [ 'a', 'c' ]), meta(300, [ 'd' ]) ],
          })).resolves.toFailTest(
            'Actor actor can only bind across sources if the smallest stream is much smaller than largest stream',
          );
        });

        it('accepts a configured cardinality ratio', async() => {
          await expect(makeActor(2).getJoinCoefficients(getAction(), {
            metadatas: [ meta(10, [ 'a' ]), meta(200, [ 'a', 'c' ]), meta(300, [ 'd' ]) ],
          })).resolves.toPassTest({
            iterations: 1,
            persistedItems: 10,
            blockingItems: 10,
            requestTime: 0,
          });
        });

        it('rejects if a target can not handle passing down join bindings', async() => {
          const action = getAction();
          action.entries[1].operation = AF.createUnion([
            assignOperationSource(AF.createNop(), source1),
            assignOperationSource(AF.createNop(), source3TriplePattern),
          ]);
          await expect(makeActor().getJoinCoefficients(action, {
            metadatas: [ meta(2, [ 'a' ]), meta(200, [ 'a', 'c' ]), meta(300, [ 'd' ]) ],
          })).resolves.toFailTest('Actor actor detected a source that can not handle passing down join bindings');
        });
      });

      describe('getOutput', () => {
        it('binds on a union and joins the result with the other operations', async() => {
          const unionInput1 = AF.createPattern(DF.variable('a'), DF.namedNode('ex:p'), DF.variable('c'));
          const unionInput2 = AF.createPattern(DF.variable('a'), DF.namedNode('ex:p'), DF.variable('c'));
          const union = AF.createUnion([
            assignOperationSource(unionInput1, source1),
            assignOperationSource(unionInput2, sourceOther),
          ]);
          const left = assignOperationSource(
            AF.createPattern(DF.variable('a'), DF.namedNode('ex:p'), DF.namedNode('ex:o')),
            source2,
          );
          const other = assignOperationSource(
            AF.createPattern(DF.variable('d'), DF.namedNode('ex:q'), DF.namedNode('ex:o')),
            source1,
          );
          const unionStream = new ArrayIterator<RDF.Bindings>([], { autoStart: false });
          const otherStream = new ArrayIterator<RDF.Bindings>([], { autoStart: false });
          const action: IActionRdfJoin = {
            context,
            type: 'inner',
            entries: [
              {
                output: <any> {
                  bindingsStream: new ArrayIterator([
                    BF.bindings([[ DF.variable('a'), DF.namedNode('ex:a1') ]]),
                    BF.bindings([[ DF.variable('a'), DF.namedNode('ex:a2') ]]),
                    BF.bindings([[ DF.variable('a'), DF.namedNode('ex:a3') ]]),
                  ], { autoStart: false }),
                  metadata: () => Promise.resolve(meta(3, [ 'a' ])),
                  type: 'bindings',
                },
                operation: left,
              },
              {
                output: <any> {
                  bindingsStream: unionStream,
                  metadata: () => Promise.resolve(meta(200, [ 'a', 'c' ])),
                  type: 'bindings',
                },
                operation: union,
              },
              {
                output: <any> {
                  bindingsStream: otherStream,
                  metadata: () => Promise.resolve(meta(300, [ 'd' ])),
                  type: 'bindings',
                },
                operation: other,
              },
            ],
          };
          const actorJoin = makeActor();
          const { result } = await actorJoin.getOutput(action, (await actorJoin.test(action)).getSideData());

          expect(unionStream.closed).toBe(true);
          expect(otherStream.closed).toBe(false);
          expect(mediatorJoin.mediate).toHaveBeenCalledWith({
            type: 'inner',
            entries: [
              {
                output: {
                  type: 'bindings',
                  bindingsStream: expect.any(AsyncIterator),
                  metadata: expect.any(Function),
                },
                operation: AF.createJoin([ left, union ], false),
                operationModified: true,
              },
              {
                output: action.entries[2].output,
                operation: other,
                operationModified: undefined,
              },
            ],
            context,
          });
          await expect(result.bindingsStream).toEqualBindingsStream([
            BF.bindings([
              [ DF.variable('a'), DF.namedNode('ex:a1') ],
              [ DF.variable('bound'), DF.namedNode('ex:bound') ],
            ]),
            BF.bindings([
              [ DF.variable('a'), DF.namedNode('ex:a2') ],
              [ DF.variable('bound'), DF.namedNode('ex:bound') ],
            ]),
            BF.bindings([
              [ DF.variable('a'), DF.namedNode('ex:a3') ],
              [ DF.variable('bound'), DF.namedNode('ex:bound') ],
            ]),
            BF.bindings([
              [ DF.variable('a'), DF.namedNode('ex:a1') ],
              [ DF.variable('bound'), DF.namedNode('ex:bound-other') ],
            ]),
            BF.bindings([
              [ DF.variable('a'), DF.namedNode('ex:a2') ],
              [ DF.variable('bound'), DF.namedNode('ex:bound-other') ],
            ]),
            BF.bindings([
              [ DF.variable('a'), DF.namedNode('ex:a3') ],
              [ DF.variable('bound'), DF.namedNode('ex:bound-other') ],
            ]),
          ], true);
          await expect(result.metadata()).resolves.toEqual({
            state: expect.any(MetadataValidationState),
            cardinality: { type: 'estimate', value: 3 },
            variables: [
              { variable: DF.variable('a'), canBeUndef: false },
              { variable: DF.variable('c'), canBeUndef: false },
            ],
          });
        });
      });
    });

    describe('createOperationFromEntries', () => {
      it('handles a single entry', () => {
        const op = AF.createNop();
        expect(actor.createOperationFromEntries(AF, [ <any>{ operation: op } ])).toBe(op);
      });

      it('handles multiple entries by joining', () => {
        const op = AF.createNop();
        expect(actor.createOperationFromEntries(AF, [ <any>{ operation: op } ])).toBe(op);
      });
    });
  });
});
