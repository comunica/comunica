import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActionQueryOperation } from '@comunica/bus-query-operation';
import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import type { IActionRdfJoinSelectivity, IActorRdfJoinSelectivityOutput } from '@comunica/bus-rdf-join-selectivity';
import { KeysQueryOperation } from '@comunica/context-entries';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import { ActionContext, Bus } from '@comunica/core';
import type { IQueryOperationResultBindings, Bindings, IActionContext } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Algebra, Factory } from 'sparqlalgebrajs/index';
import { ActorRdfJoinOptionalBind } from '../lib/ActorRdfJoinOptionalBind';
import '@comunica/jest';

const DF = new DataFactory();
const BF = new BindingsFactory();
const FACTORY = new Factory();

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
    IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>;
    let mediatorQueryOperation: Mediator<Actor<IActionQueryOperation, IActorTest, IQueryOperationResultBindings>,
    IActionQueryOperation, IActorTest, IQueryOperationResultBindings>;
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
              cardinality: { type: 'estimate', value: data.length },
              canContainUndefs: false,
              variables: [ DF.variable('bound') ],
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
      });
    });

    describe('getJoinCoefficients', () => {
      it('should handle two entries', async() => {
        expect(await actor.getJoinCoefficients(
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
          [
            {
              cardinality: { type: 'estimate', value: 3 },
              pageSize: 100,
              requestTime: 10,
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
            {
              cardinality: { type: 'estimate', value: 2 },
              pageSize: 100,
              requestTime: 20,
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
          ],
        )).toEqual({
          iterations: 0.480_000_000_000_000_1,
          persistedItems: 0,
          blockingItems: 0,
          requestTime: 0.120_000_000_000_000_02,
        });
      });

      it('should handle two entries with a lower variable overlap', async() => {
        expect(await actor.getJoinCoefficients(
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
          [
            {
              cardinality: { type: 'estimate', value: 3 },
              pageSize: 100,
              requestTime: 10,
              canContainUndefs: false,
              variables: [ DF.variable('a'), DF.variable('b'), DF.variable('d') ],
            },
            {
              cardinality: { type: 'estimate', value: 2 },
              pageSize: 100,
              requestTime: 20,
              canContainUndefs: false,
              variables: [ DF.variable('a'), DF.variable('c'), DF.variable('e') ],
            },
          ],
        )).toEqual({
          iterations: 0.480_000_000_000_000_1,
          persistedItems: 0,
          blockingItems: 0,
          requestTime: 0.120_000_000_000_000_02,
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
          [
            {
              cardinality: { type: 'estimate', value: 3 },
              pageSize: 100,
              requestTime: 10,
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
            {
              cardinality: { type: 'estimate', value: 2 },
              pageSize: 100,
              requestTime: 20,
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
          ],
        )).rejects.toThrowError('Actor actor can not bind on Extend and Group operations');
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
          [
            {
              cardinality: { type: 'estimate', value: 3 },
              pageSize: 100,
              requestTime: 10,
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
            {
              cardinality: { type: 'estimate', value: 2 },
              pageSize: 100,
              requestTime: 20,
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
          ],
        )).rejects.toThrowError('Actor actor can not bind on Extend and Group operations');
      });

      it('should not reject on a left stream of type group', async() => {
        expect(await actor.getJoinCoefficients(
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
          [
            {
              cardinality: { type: 'estimate', value: 3 },
              pageSize: 100,
              requestTime: 10,
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
            {
              cardinality: { type: 'estimate', value: 2 },
              pageSize: 100,
              requestTime: 20,
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
          ],
        )).toEqual({
          iterations: 0.480_000_000_000_000_1,
          persistedItems: 0,
          blockingItems: 0,
          requestTime: 0.120_000_000_000_000_02,
        });
      });
    });

    describe('run', () => {
      it('should handle two entries with a context', async() => {
        context = new ActionContext({ a: 'b' });
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
                  cardinality: { type: 'estimate', value: 3 },
                  canContainUndefs: false,
                  variables: [ DF.variable('a') ],
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
                  cardinality: { type: 'estimate', value: 3 },
                  canContainUndefs: false,
                  variables: [ DF.variable('a'), DF.variable('b') ],
                }),
                type: 'bindings',
              },
              operation: FACTORY.createPattern(DF.variable('a'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
            },
          ],
        };
        const result = await actor.run(action);

        // Validate output
        expect(result.type).toEqual('bindings');
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
        expect(await result.metadata()).toEqual({
          cardinality: { type: 'estimate', value: 7.2 },
          canContainUndefs: true,
          variables: [ DF.variable('a'), DF.variable('b') ],
        });

        // Validate mock calls
        expect(mediatorQueryOperation.mediate).toHaveBeenCalledTimes(3);
        expect(mediatorQueryOperation.mediate).toHaveBeenNthCalledWith(1, {
          operation: FACTORY.createPattern(DF.literal('1'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
          context: new ActionContext({
            a: 'b',
            [KeysQueryOperation.joinLeftMetadata.name]: {
              cardinality: { type: 'estimate', value: 3 },
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
            [KeysQueryOperation.joinRightMetadatas.name]: [{
              cardinality: { type: 'estimate', value: 3 },
              canContainUndefs: false,
              variables: [ DF.variable('a'), DF.variable('b') ],
            }],
            [KeysQueryOperation.joinBindings.name]: BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          }),
        });
        expect(mediatorQueryOperation.mediate).toHaveBeenNthCalledWith(2, {
          operation: FACTORY.createPattern(DF.literal('2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
          context: new ActionContext({
            a: 'b',
            [KeysQueryOperation.joinLeftMetadata.name]: {
              cardinality: { type: 'estimate', value: 3 },
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
            [KeysQueryOperation.joinRightMetadatas.name]: [{
              cardinality: { type: 'estimate', value: 3 },
              canContainUndefs: false,
              variables: [ DF.variable('a'), DF.variable('b') ],
            }],
            [KeysQueryOperation.joinBindings.name]: BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          }),
        });
        expect(mediatorQueryOperation.mediate).toHaveBeenNthCalledWith(3, {
          operation: FACTORY.createPattern(DF.literal('3'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
          context: new ActionContext({
            a: 'b',
            [KeysQueryOperation.joinLeftMetadata.name]: {
              cardinality: { type: 'estimate', value: 3 },
              canContainUndefs: false,
              variables: [ DF.variable('a') ],
            },
            [KeysQueryOperation.joinRightMetadatas.name]: [{
              cardinality: { type: 'estimate', value: 3 },
              canContainUndefs: false,
              variables: [ DF.variable('a'), DF.variable('b') ],
            }],
            [KeysQueryOperation.joinBindings.name]: BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
          }),
        });
      });
    });
  });
});
