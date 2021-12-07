import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActionQueryOperation } from '@comunica/bus-query-operation';
import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import type { IActionRdfJoinSelectivity, IActorRdfJoinSelectivityOutput } from '@comunica/bus-rdf-join-selectivity';
import { KeysQueryOperation } from '@comunica/context-entries';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import { ActionContext, Bus } from '@comunica/core';
import type { IQueryableResultBindings, Bindings, IActionContext } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Algebra, Factory } from 'sparqlalgebrajs/index';
import { ActorRdfJoinOptionalBind } from '../lib/ActorRdfJoinOptionalBind';
const arrayifyStream = require('arrayify-stream');

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
    let mediatorQueryOperation: Mediator<Actor<IActionQueryOperation, IActorTest, IQueryableResultBindings>,
    IActionQueryOperation, IActorTest, IQueryableResultBindings>;
    let actor: ActorRdfJoinOptionalBind;

    beforeEach(() => {
      mediatorJoinSelectivity = <any> {
        mediate: async() => ({ selectivity: 0.8 }),
      };
      mediatorQueryOperation = <any> {
        mediate: jest.fn(async(arg: IActionQueryOperation): Promise<IQueryableResultBindings> => {
          let data: Bindings[] = [];
          switch ((<Algebra.Pattern> arg.operation).subject.value) {
            case '1':
              data = [
                BF.bindings({ '?b': DF.literal('1') }),
              ];
              break;
            case '3':
              data = [
                BF.bindings({ '?b': DF.literal('1') }),
                BF.bindings({ '?b': DF.literal('2') }),
              ];
              break;
          }

          return {
            bindingsStream: new ArrayIterator(data, { autoStart: false }),
            metadata: () => Promise.resolve({ cardinality: data.length, canContainUndefs: false }),
            type: 'bindings',
            variables: [ 'bound' ],
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
                output: <any>{
                  variables: [ 'a' ],
                },
                operation: <any>{},
              },
              {
                output: <any>{
                  variables: [ 'a' ],
                },
                operation: <any>{},
              },
            ],
            context,
          },
          [
            { cardinality: 3, pageSize: 100, requestTime: 10, canContainUndefs: false },
            { cardinality: 2, pageSize: 100, requestTime: 20, canContainUndefs: false },
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
                output: <any>{
                  variables: [ 'a', 'b', 'd' ],
                },
                operation: <any>{},
              },
              {
                output: <any>{
                  variables: [ 'a', 'c', 'e' ],
                },
                operation: <any>{},
              },
            ],
            context,
          },
          [
            { cardinality: 3, pageSize: 100, requestTime: 10, canContainUndefs: false },
            { cardinality: 2, pageSize: 100, requestTime: 20, canContainUndefs: false },
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
                output: <any>{
                  metadata: () => Promise.resolve({ cardinality: 3 }),
                  variables: [ 'a' ],
                },
                operation: <any>{},
              },
              {
                output: <any>{
                  metadata: () => Promise.resolve({ cardinality: 2 }),
                  variables: [ 'a' ],
                },
                operation: <any>{ type: Algebra.types.EXTEND },
              },
            ],
            context,
          },
          [
            { cardinality: 3, pageSize: 100, requestTime: 10, canContainUndefs: false },
            { cardinality: 2, pageSize: 100, requestTime: 20, canContainUndefs: false },
          ],
        )).rejects.toThrowError('Actor actor can not bind on Extend and Group operations');
      });

      it('should reject on a right stream of type group', async() => {
        await expect(actor.getJoinCoefficients(
          {
            type: 'optional',
            entries: [
              {
                output: <any> {
                  metadata: () => Promise.resolve({ cardinality: 3 }),
                  variables: [ 'a' ],
                },
                operation: <any> {},
              },
              {
                output: <any> {
                  metadata: () => Promise.resolve({ cardinality: 2 }),
                  variables: [ 'a' ],
                },
                operation: <any> { type: Algebra.types.GROUP },
              },
            ],
            context,
          },
          [
            { cardinality: 3, pageSize: 100, requestTime: 10, canContainUndefs: false },
            { cardinality: 2, pageSize: 100, requestTime: 20, canContainUndefs: false },
          ],
        )).rejects.toThrowError('Actor actor can not bind on Extend and Group operations');
      });

      it('should not reject on a left stream of type group', async() => {
        expect(await actor.getJoinCoefficients(
          {
            type: 'optional',
            entries: [
              {
                output: <any> {
                  metadata: () => Promise.resolve({ cardinality: 3 }),
                  variables: [ 'a' ],
                },
                operation: <any> { type: Algebra.types.GROUP },
              },
              {
                output: <any> {
                  metadata: () => Promise.resolve({ cardinality: 2 }),
                  variables: [ 'a' ],
                },
                operation: <any> {},
              },
            ],
            context,
          },
          [
            { cardinality: 3, pageSize: 100, requestTime: 10, canContainUndefs: false },
            { cardinality: 2, pageSize: 100, requestTime: 20, canContainUndefs: false },
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
                  BF.bindings({ '?a': DF.literal('1') }),
                  BF.bindings({ '?a': DF.literal('2') }),
                  BF.bindings({ '?a': DF.literal('3') }),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false }),
                type: 'bindings',
                variables: [ 'a' ],
              },
              operation: FACTORY.createPattern(DF.variable('a'), DF.namedNode('ex:p1'), DF.variable('b')),
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  // This stream will be unused!!!
                  BF.bindings({ '?a': DF.literal('1'), '?b': DF.literal('1') }),
                  BF.bindings({ '?a': DF.literal('3'), '?b': DF.literal('1') }),
                  BF.bindings({ '?a': DF.literal('3'), '?b': DF.literal('2') }),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false }),
                type: 'bindings',
                variables: [ 'a', 'b' ],
              },
              operation: FACTORY.createPattern(DF.variable('a'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
            },
          ],
        };
        const result = await actor.run(action);

        // Validate output
        expect(result.type).toEqual('bindings');
        expect(await arrayifyStream(result.bindingsStream)).toEqual([
          BF.bindings({ '?a': DF.literal('1'), '?b': DF.literal('1') }),
          BF.bindings({ '?a': DF.literal('2') }),
          BF.bindings({ '?a': DF.literal('3'), '?b': DF.literal('1') }),
          BF.bindings({ '?a': DF.literal('3'), '?b': DF.literal('2') }),
        ]);
        expect(result.variables).toEqual([ 'a', 'b' ]);
        expect(await result.metadata()).toEqual({ cardinality: 7.2, canContainUndefs: true });

        // Validate mock calls
        expect(mediatorQueryOperation.mediate).toHaveBeenCalledTimes(3);
        expect(mediatorQueryOperation.mediate).toHaveBeenNthCalledWith(1, {
          operation: FACTORY.createPattern(DF.literal('1'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
          context: new ActionContext({
            a: 'b',
            [KeysQueryOperation.joinLeftMetadata.name]: { cardinality: 3, canContainUndefs: false },
            [KeysQueryOperation.joinRightMetadatas.name]: [{ cardinality: 3, canContainUndefs: false }],
            [KeysQueryOperation.joinBindings.name]: BF.bindings({ '?a': DF.literal('1') }),
          }),
        });
        expect(mediatorQueryOperation.mediate).toHaveBeenNthCalledWith(2, {
          operation: FACTORY.createPattern(DF.literal('2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
          context: new ActionContext({
            a: 'b',
            [KeysQueryOperation.joinLeftMetadata.name]: { cardinality: 3, canContainUndefs: false },
            [KeysQueryOperation.joinRightMetadatas.name]: [{ cardinality: 3, canContainUndefs: false }],
            [KeysQueryOperation.joinBindings.name]: BF.bindings({ '?a': DF.literal('2') }),
          }),
        });
        expect(mediatorQueryOperation.mediate).toHaveBeenNthCalledWith(3, {
          operation: FACTORY.createPattern(DF.literal('3'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
          context: new ActionContext({
            a: 'b',
            [KeysQueryOperation.joinLeftMetadata.name]: { cardinality: 3, canContainUndefs: false },
            [KeysQueryOperation.joinRightMetadatas.name]: [{ cardinality: 3, canContainUndefs: false }],
            [KeysQueryOperation.joinBindings.name]: BF.bindings({ '?a': DF.literal('3') }),
          }),
        });
      });
    });
  });
});
