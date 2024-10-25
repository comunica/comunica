import type { IActionQueryOperation } from '@comunica/bus-query-operation';
import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import type { IActionRdfJoinSelectivity, IActorRdfJoinSelectivityOutput } from '@comunica/bus-rdf-join-selectivity';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import { ActionContext, Bus } from '@comunica/core';
import type { IQueryOperationResultBindings, Bindings, IActionContext } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Algebra, Factory } from 'sparqlalgebrajs/index';
import { ActorRdfJoinOptionalBind } from '../lib/ActorRdfJoinOptionalBind';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const FACTORY = new Factory();
const mediatorMergeBindingsContext: any = {
  mediate: () => ({}),
};

describe('ActorRdfJoinOptionalBind', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('An ActorRdfJoinOptionalBind instance', () => {
    let mediatorJoinSelectivity: Mediator<
    Actor<IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>,
    IActionRdfJoinSelectivity,
IActorTest,
IActorRdfJoinSelectivityOutput
>;
    let mediatorQueryOperation: Mediator<
      Actor<IActionQueryOperation, IActorTest, IQueryOperationResultBindings>,
IActionQueryOperation,
IActorTest,
IQueryOperationResultBindings
>;
    let actor: ActorRdfJoinOptionalBind;

    beforeEach(() => {
      mediatorJoinSelectivity = <any> {
        mediate: async() => ({ selectivity: 0.8 }),
      };
      mediatorQueryOperation = <any> {
        mediate: jest.fn(async(arg: IActionQueryOperation): Promise<IQueryOperationResultBindings> => {
          let data: Bindings[] = [];
          switch ((<Algebra.Pattern> arg.operation).subject.value) {
            case '1':
              data = [
                BF.bindings([[ DF.variable('b'), DF.literal('1') ]]),
              ];
              break;
            case '3':
              data = [
                BF.bindings([
                  [ DF.variable('b'), DF.literal('1') ],
                ]),
                BF.bindings([
                  [ DF.variable('b'), DF.literal('2') ],
                ]),
              ];
              break;
          }

          return {
            bindingsStream: new ArrayIterator(data, { autoStart: false }),
            metadata: () => Promise.resolve({
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: data.length },
              variables: [{ variable: DF.variable('bound'), canBeUndef: false }],
            }),
            type: 'bindings',
          };
        }),
      };
      actor = new ActorRdfJoinOptionalBind({
        name: 'actor',
        bus,
        bindOrder: 'depth-first',
        selectivityModifier: 0.1,
        mediatorQueryOperation,
        mediatorJoinSelectivity,
        mediatorMergeBindingsContext,
      });
    });

    describe('test', () => {
      it('should throw on non-overlapping variables', async() => {
        await expect(actor.test(
          {
            type: 'optional',
            entries: [
              {
                output: <any>{
                  type: 'bindings',
                  metadata: async() => ({
                    state: new MetadataValidationState(),
                    cardinality: { type: 'estimate', value: 3 },
                    pageSize: 100,
                    requestTime: 10,
                    variables: [
                      { variable: DF.variable('a'), canBeUndef: false },
                    ],
                  }),
                },
                operation: <any>{},
              },
              {
                output: <any>{
                  type: 'bindings',
                  metadata: async() => ({
                    state: new MetadataValidationState(),
                    cardinality: { type: 'estimate', value: 2 },
                    pageSize: 100,
                    requestTime: 20,
                    variables: [
                      { variable: DF.variable('b'), canBeUndef: false },
                    ],
                  }),
                },
                operation: <any>{},
              },
            ],
            context,
          },
        )).resolves.toFailTest('Actor actor can only join entries with at least one common variable');
      });
    });

    describe('getJoinCoefficients', () => {
      it('should handle two entries', async() => {
        await expect(actor.getJoinCoefficients(
          {
            type: 'optional',
            entries: [
              {
                output: <any>{},
                operation: <any>{},
              },
              {
                output: <any>{},
                operation: <any>{},
              },
            ],
            context,
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
        )).resolves.toPassTest({
          iterations: 0.480_000_000_000_000_1,
          persistedItems: 0,
          blockingItems: 0,
          requestTime: 0.396,
        });
      });

      it('should handle two entries with a lower variable overlap', async() => {
        await expect(actor.getJoinCoefficients(
          {
            type: 'optional',
            entries: [
              {
                output: <any>{},
                operation: <any>{},
              },
              {
                output: <any>{},
                operation: <any>{},
              },
            ],
            context,
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
                  { variable: DF.variable('d'), canBeUndef: false },
                ],
              },
              {
                state: new MetadataValidationState(),
                cardinality: { type: 'estimate', value: 2 },
                pageSize: 100,
                requestTime: 20,

                variables: [
                  { variable: DF.variable('a'), canBeUndef: false },
                  { variable: DF.variable('c'), canBeUndef: false },
                  { variable: DF.variable('e'), canBeUndef: false },
                ],
              },
            ],
          },
        )).resolves.toPassTest({
          iterations: 0.480_000_000_000_000_1,
          persistedItems: 0,
          blockingItems: 0,
          requestTime: 0.396,
        });
      });

      it('should reject on a right stream of type extend', async() => {
        await expect(actor.getJoinCoefficients(
          {
            type: 'optional',
            entries: [
              {
                output: <any>{},
                operation: <any>{},
              },
              {
                output: <any>{},
                operation: <any>{ type: Algebra.types.EXTEND },
              },
            ],
            context,
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
            type: 'optional',
            entries: [
              {
                output: <any> {},
                operation: <any> {},
              },
              {
                output: <any> {},
                operation: <any> { type: Algebra.types.GROUP },
              },
            ],
            context,
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
            type: 'optional',
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
            context,
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
        )).resolves.toPassTest({
          iterations: 0.480_000_000_000_000_1,
          persistedItems: 0,
          blockingItems: 0,
          requestTime: 0.396,
        });
      });
    });

    describe('run', () => {
      it('should handle two entries with a context', async() => {
        context = new ActionContext({ a: 'b', [KeysInitQuery.dataFactory.name]: DF });
        const action: IActionRdfJoin = {
          context,
          type: 'optional',
          entries: [
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
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
              operation: FACTORY.createPattern(DF.variable('a'), DF.namedNode('ex:p1'), DF.variable('b')),
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  // This stream will be unused!!!
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('1') ],
                    [ DF.variable('b'), DF.literal('1') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('3') ],
                    [ DF.variable('b'), DF.literal('1') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('3') ],
                    [ DF.variable('b'), DF.literal('2') ],
                  ]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 3 },

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                    { variable: DF.variable('b'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: FACTORY.createPattern(DF.variable('a'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
            },
          ],
        };
        const result = await actor.run(action, undefined!);

        // Validate output
        expect(result.type).toBe('bindings');
        await expect(result.bindingsStream).toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('a'), DF.literal('1') ],
            [ DF.variable('b'), DF.literal('1') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('2') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('3') ],
            [ DF.variable('b'), DF.literal('1') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('3') ],
            [ DF.variable('b'), DF.literal('2') ],
          ]),
        ]);
        await expect(result.metadata()).resolves.toEqual({
          state: expect.any(MetadataValidationState),
          cardinality: { type: 'estimate', value: 7.2 },
          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
            { variable: DF.variable('b'), canBeUndef: true },
          ],
        });

        // Validate mock calls
        expect(mediatorQueryOperation.mediate).toHaveBeenCalledTimes(3);
        expect(mediatorQueryOperation.mediate).toHaveBeenNthCalledWith(1, {
          operation: FACTORY.createPattern(DF.literal('1'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
          context: new ActionContext({
            a: 'b',
            [KeysInitQuery.dataFactory.name]: DF,
            [KeysQueryOperation.joinLeftMetadata.name]: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 3 },

              variables: [
                { variable: DF.variable('a'), canBeUndef: false },
              ],
            },
            [KeysQueryOperation.joinRightMetadatas.name]: [{
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 3 },

              variables: [
                { variable: DF.variable('a'), canBeUndef: false },
                { variable: DF.variable('b'), canBeUndef: false },
              ],
            }],
            [KeysQueryOperation.joinBindings.name]: BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          }),
        });
        expect(mediatorQueryOperation.mediate).toHaveBeenNthCalledWith(2, {
          operation: FACTORY.createPattern(DF.literal('2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
          context: new ActionContext({
            a: 'b',
            [KeysInitQuery.dataFactory.name]: DF,
            [KeysQueryOperation.joinLeftMetadata.name]: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 3 },

              variables: [
                { variable: DF.variable('a'), canBeUndef: false },
              ],
            },
            [KeysQueryOperation.joinRightMetadatas.name]: [{
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 3 },

              variables: [
                { variable: DF.variable('a'), canBeUndef: false },
                { variable: DF.variable('b'), canBeUndef: false },
              ],
            }],
            [KeysQueryOperation.joinBindings.name]: BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          }),
        });
        expect(mediatorQueryOperation.mediate).toHaveBeenNthCalledWith(3, {
          operation: FACTORY.createPattern(DF.literal('3'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
          context: new ActionContext({
            a: 'b',
            [KeysInitQuery.dataFactory.name]: DF,
            [KeysQueryOperation.joinLeftMetadata.name]: {
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 3 },

              variables: [
                { variable: DF.variable('a'), canBeUndef: false },
              ],
            },
            [KeysQueryOperation.joinRightMetadatas.name]: [{
              state: expect.any(MetadataValidationState),
              cardinality: { type: 'estimate', value: 3 },

              variables: [
                { variable: DF.variable('a'), canBeUndef: false },
                { variable: DF.variable('b'), canBeUndef: false },
              ],
            }],
            [KeysQueryOperation.joinBindings.name]: BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
          }),
        });
      });
    });
  });
});
