import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActionQueryOperation } from '@comunica/bus-query-operation';
import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import type { IActionRdfJoinSelectivity, IActorRdfJoinSelectivityOutput } from '@comunica/bus-rdf-join-selectivity';
import { KeysQueryOperation } from '@comunica/context-entries';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext, IQueryableResultBindings } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Factory, Algebra } from 'sparqlalgebrajs';
import { ActorRdfJoinMultiBind } from '../lib/ActorRdfJoinMultiBind';
import Mock = jest.Mock;
const arrayifyStream = require('arrayify-stream');

const DF = new DataFactory();
const BF = new BindingsFactory();
const FACTORY = new Factory();

describe('ActorRdfJoinMultiBind', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfJoinMultiBind instance', () => {
    let mediatorJoinSelectivity: Mediator<
    Actor<IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>,
    IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>;
    let context: IActionContext;
    let mediatorQueryOperation: Mediator<Actor<IActionQueryOperation, IActorTest, IQueryableResultBindings>,
    IActionQueryOperation, IActorTest, IQueryableResultBindings>;
    let actor: ActorRdfJoinMultiBind;
    let logSpy: Mock;

    beforeEach(() => {
      mediatorJoinSelectivity = <any> {
        mediate: async() => ({ selectivity: 0.8 }),
      };
      context = new ActionContext({ a: 'b' });
      mediatorQueryOperation = <any> {
        mediate: jest.fn(async(arg: IActionQueryOperation): Promise<IQueryableResultBindings> => {
          return {
            bindingsStream: new ArrayIterator([
              BF.bindings({ '?bound': DF.namedNode('ex:bound1') }),
              BF.bindings({ '?bound': DF.namedNode('ex:bound2') }),
              BF.bindings({ '?bound': DF.namedNode('ex:bound3') }),
            ], { autoStart: false }),
            metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false }),
            type: 'bindings',
            variables: [ 'bound' ],
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
      });
      logSpy = (<any> actor).logDebug = jest.fn();
    });

    describe('getJoinCoefficients', () => {
      it('should handle three entries', async() => {
        expect(await actor.getJoinCoefficients(
          {
            type: 'inner',
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
              {
                output: <any>{
                  variables: [ 'a' ],
                },
                operation: <any>{},
              },
            ],
          },
          [
            { cardinality: 3, pageSize: 100, requestTime: 10, canContainUndefs: false },
            { cardinality: 2, pageSize: 100, requestTime: 20, canContainUndefs: false },
            { cardinality: 5, pageSize: 100, requestTime: 30, canContainUndefs: false },
          ],
        )).toEqual({
          iterations: 1.280_000_000_000_000_2,
          persistedItems: 0,
          blockingItems: 0,
          requestTime: 0.440_96,
        });
      });

      it('should handle three entries with a lower variable overlap', async() => {
        expect(await actor.getJoinCoefficients(
          {
            type: 'inner',
            entries: [
              {
                output: <any>{
                  variables: [ 'a', 'b' ],
                },
                operation: <any>{},
              },
              {
                output: <any>{
                  variables: [ 'a', 'b' ],
                },
                operation: <any>{},
              },
              {
                output: <any>{
                  variables: [ 'a', 'c' ],
                },
                operation: <any>{},
              },
            ],
          },
          [
            { cardinality: 3, pageSize: 100, requestTime: 10, canContainUndefs: false },
            { cardinality: 2, pageSize: 100, requestTime: 20, canContainUndefs: false },
            { cardinality: 5, pageSize: 100, requestTime: 30, canContainUndefs: false },
          ],
        )).toEqual({
          iterations: 1.280_000_000_000_000_2,
          persistedItems: 0,
          blockingItems: 0,
          requestTime: 0.440_96,
        });
      });

      it('should reject on a right stream of type extend', async() => {
        await expect(actor.getJoinCoefficients(
          {
            type: 'inner',
            entries: [
              {
                output: <any>{
                  metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false }),
                  variables: [ 'a' ],
                },
                operation: <any>{ type: Algebra.types.EXTEND },
              },
              {
                output: <any>{
                  metadata: () => Promise.resolve({ cardinality: 2, canContainUndefs: false }),
                  variables: [ 'a' ],
                },
                operation: <any>{},
              },
            ],
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
            type: 'inner',
            entries: [
              {
                output: <any> {
                  metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false }),
                  variables: [ 'a' ],
                },
                operation: <any> { type: Algebra.types.GROUP },
              },
              {
                output: <any> {
                  metadata: () => Promise.resolve({ cardinality: 2, canContainUndefs: false }),
                  variables: [ 'a' ],
                },
                operation: <any> {},
              },
            ],
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
            type: 'inner',
            entries: [
              {
                output: <any> {
                  metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false }),
                  variables: [ 'a' ],
                },
                operation: <any> {},
              },
              {
                output: <any> {
                  metadata: () => Promise.resolve({ cardinality: 2, canContainUndefs: false }),
                  variables: [ 'a' ],
                },
                operation: <any> { type: Algebra.types.GROUP },
              },
            ],
          },
          [
            { cardinality: 3, pageSize: 100, requestTime: 10, canContainUndefs: false },
            { cardinality: 2, pageSize: 100, requestTime: 20, canContainUndefs: false },
          ],
        )).toEqual({
          iterations: 0.480_000_000_000_000_1,
          persistedItems: 0,
          blockingItems: 0,
          requestTime: 0.403_840_000_000_000_03,
        });
      });
    });

    describe('createBindStream', () => {
      it('throws when an unknown bind order is passed', async() => {
        expect(() => (<any> ActorRdfJoinMultiBind).createBindStream('unknown'))
          .toThrowError(`Received request for unknown bind order: unknown`);
      });
    });

    describe('getLeftEntryIndex', () => {
      it('picks the lowest of 2 entries', async() => {
        expect(await ActorRdfJoinMultiBind.getLeftEntryIndex(
          [
            {
              output: <any> {
                variables: [ 'a' ],
              },
              operation: <any> {},
            },
            {
              output: <any> {
                variables: [ 'a' ],
              },
              operation: <any> {},
            },
          ],
          [
            { cardinality: 3, canContainUndefs: false },
            { cardinality: 2, canContainUndefs: false },
          ],
        )).toEqual(1);
      });

      it('picks the lowest of 3 entries', async() => {
        expect(await ActorRdfJoinMultiBind.getLeftEntryIndex(
          [
            {
              output: <any> {
                variables: [ 'a' ],
              },
              operation: <any> {},
            },
            {
              output: <any> {
                variables: [ 'a' ],
              },
              operation: <any> {},
            },
            {
              output: <any> {
                variables: [ 'a' ],
              },
              operation: <any> {},
            },
          ],
          [
            { cardinality: 3, canContainUndefs: false },
            { cardinality: 2, canContainUndefs: false },
            { cardinality: 5, canContainUndefs: false },
          ],
        )).toEqual(1);
      });

      it('picks the first of 3 equal entries', async() => {
        expect(await ActorRdfJoinMultiBind.getLeftEntryIndex(
          [
            {
              output: <any> {
                variables: [ 'a' ],
              },
              operation: <any> {},
            },
            {
              output: <any> {
                variables: [ 'a' ],
              },
              operation: <any> {},
            },
            {
              output: <any> {
                variables: [ 'a' ],
              },
              operation: <any> {},
            },
          ],
          [
            { cardinality: 3, canContainUndefs: false },
            { cardinality: 3, canContainUndefs: false },
            { cardinality: 3, canContainUndefs: false },
          ],
        )).toEqual(0);
      });

      it('picks the first of 3 entries if there is an undef', async() => {
        expect(await ActorRdfJoinMultiBind.getLeftEntryIndex(
          [
            {
              output: <any> {
                variables: [ 'a' ],
              },
              operation: <any> {},
            },
            {
              output: <any> {
                variables: [ 'a' ],
              },
              operation: <any> {},
            },
            {
              output: <any> {
                variables: [ 'a' ],
              },
              operation: <any> {},
            },
          ],
          [
            { cardinality: 3, canContainUndefs: false },
            { cardinality: 2, canContainUndefs: false },
            { cardinality: 5, canContainUndefs: true },
          ],
        )).toEqual(0);
      });

      it('throws if there are no overlapping variables', async() => {
        await expect(ActorRdfJoinMultiBind.getLeftEntryIndex(
          [
            {
              output: <any> {
                metadata: () => Promise.resolve({ cardinality: 3 }),
                variables: [ 'a1', 'b1' ],
              },
              operation: <any> {},
            },
            {
              output: <any> {
                metadata: () => Promise.resolve({ cardinality: 2 }),
                variables: [ 'a2', 'b2' ],
              },
              operation: <any> {},
            },
          ],
          [
            { cardinality: 3, canContainUndefs: false },
            { cardinality: 2, canContainUndefs: false },
          ],
        )).rejects.toThrow('Bind join can only join entries with at least one common variable');
      });

      it('excludes entries without common variables', async() => {
        expect(await ActorRdfJoinMultiBind.getLeftEntryIndex(
          [
            {
              output: <any> {
                variables: [ 'b' ],
              },
              operation: <any> {},
            },
            {
              output: <any> {
                variables: [ 'a' ],
              },
              operation: <any> {},
            },
            {
              output: <any> {
                variables: [ 'a' ],
              },
              operation: <any> {},
            },
          ],
          [
            { cardinality: 1, canContainUndefs: false },
            { cardinality: 3, canContainUndefs: false },
            { cardinality: 2, canContainUndefs: false },
          ],
        )).toEqual(2);
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
                  BF.bindings({ '?b': DF.namedNode('ex:b1') }),
                  BF.bindings({ '?b': DF.namedNode('ex:b2') }),
                  BF.bindings({ '?b': DF.namedNode('ex:b3') }),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false }),
                type: 'bindings',
                variables: [ 'a', 'b' ],
              },
              operation: FACTORY.createPattern(DF.variable('a'), DF.namedNode('ex:p1'), DF.variable('b')),
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings({ '?a': DF.namedNode('ex:a1') }),
                  BF.bindings({ '?a': DF.namedNode('ex:a2') }),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 1, canContainUndefs: false }),
                type: 'bindings',
                variables: [ 'a' ],
              },
              operation: FACTORY.createPattern(DF.variable('a'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
            },
          ],
        };
        const { result, physicalPlanMetadata } = await actor.getOutput(action);

        // Validate output
        expect(result.type).toEqual('bindings');
        expect(await arrayifyStream(result.bindingsStream)).toEqual([
          BF.bindings({ '?bound': DF.namedNode('ex:bound1'), '?a': DF.namedNode('ex:a1') }),
          BF.bindings({ '?bound': DF.namedNode('ex:bound2'), '?a': DF.namedNode('ex:a1') }),
          BF.bindings({ '?bound': DF.namedNode('ex:bound3'), '?a': DF.namedNode('ex:a1') }),
          BF.bindings({ '?bound': DF.namedNode('ex:bound1'), '?a': DF.namedNode('ex:a2') }),
          BF.bindings({ '?bound': DF.namedNode('ex:bound2'), '?a': DF.namedNode('ex:a2') }),
          BF.bindings({ '?bound': DF.namedNode('ex:bound3'), '?a': DF.namedNode('ex:a2') }),
        ]);
        expect(result.variables).toEqual([ 'a', 'b' ]);
        expect(await result.metadata()).toEqual({ cardinality: 2.400_000_000_000_000_4, canContainUndefs: false });

        // Validate physicalPlanMetadata
        expect(physicalPlanMetadata).toEqual({
          bindIndex: 1,
          bindOrder: 'depth-first',
        });

        // Validate mock calls
        expect(logSpy).toHaveBeenCalledWith(context, 'First entry for Bind Join: ', expect.any(Function));
        expect(logSpy.mock.calls[0][2]()).toEqual({
          entry: action.entries[1].operation,
          metadata: { cardinality: 1, canContainUndefs: false },
        });
        expect(mediatorQueryOperation.mediate).toHaveBeenCalledTimes(2);
        expect(mediatorQueryOperation.mediate).toHaveBeenNthCalledWith(1, {
          operation: FACTORY.createPattern(DF.namedNode('ex:a1'), DF.namedNode('ex:p1'), DF.variable('b')),
          context: new ActionContext({
            a: 'b',
            [KeysQueryOperation.joinLeftMetadata.name]: { cardinality: 1, canContainUndefs: false },
            [KeysQueryOperation.joinRightMetadatas.name]: [{ cardinality: 3, canContainUndefs: false }],
            [KeysQueryOperation.joinBindings.name]: BF.bindings({ '?a': DF.namedNode('ex:a1') }),
          }),
        });
        expect(mediatorQueryOperation.mediate).toHaveBeenNthCalledWith(2, {
          operation: FACTORY.createPattern(DF.namedNode('ex:a2'), DF.namedNode('ex:p1'), DF.variable('b')),
          context: new ActionContext({
            a: 'b',
            [KeysQueryOperation.joinLeftMetadata.name]: { cardinality: 1, canContainUndefs: false },
            [KeysQueryOperation.joinRightMetadatas.name]: [{ cardinality: 3, canContainUndefs: false }],
            [KeysQueryOperation.joinBindings.name]: BF.bindings({ '?a': DF.namedNode('ex:a2') }),
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
        });

        const action: IActionRdfJoin = {
          context,
          type: 'inner',
          entries: [
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings({ '?b': DF.namedNode('ex:b1') }),
                  BF.bindings({ '?b': DF.namedNode('ex:b2') }),
                  BF.bindings({ '?b': DF.namedNode('ex:b3') }),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false }),
                type: 'bindings',
                variables: [ 'a', 'b' ],
              },
              operation: FACTORY.createPattern(DF.variable('a'), DF.namedNode('ex:p1'), DF.variable('b')),
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings({ '?a': DF.namedNode('ex:a1') }),
                  BF.bindings({ '?a': DF.namedNode('ex:a2') }),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 1, canContainUndefs: false }),
                type: 'bindings',
                variables: [ 'a' ],
              },
              operation: FACTORY.createPattern(DF.variable('a'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
            },
          ],
        };
        const { result } = await actor.getOutput(action);

        // Validate output
        expect(result.type).toEqual('bindings');
        expect(await arrayifyStream(result.bindingsStream)).toEqual([
          BF.bindings({ '?bound': DF.namedNode('ex:bound1'), '?a': DF.namedNode('ex:a1') }),
          BF.bindings({ '?bound': DF.namedNode('ex:bound1'), '?a': DF.namedNode('ex:a2') }),
          BF.bindings({ '?bound': DF.namedNode('ex:bound2'), '?a': DF.namedNode('ex:a1') }),
          BF.bindings({ '?bound': DF.namedNode('ex:bound3'), '?a': DF.namedNode('ex:a1') }),
          BF.bindings({ '?bound': DF.namedNode('ex:bound2'), '?a': DF.namedNode('ex:a2') }),
          BF.bindings({ '?bound': DF.namedNode('ex:bound3'), '?a': DF.namedNode('ex:a2') }),
        ]);
        expect(result.variables).toEqual([ 'a', 'b' ]);
        expect(await result.metadata()).toEqual({ cardinality: 2.400_000_000_000_000_4, canContainUndefs: false });
      });

      it('should handle two entries without context', async() => {
        const action: IActionRdfJoin = {
          type: 'inner',
          entries: [
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings({ '?b': DF.namedNode('ex:b1') }),
                  BF.bindings({ '?b': DF.namedNode('ex:b2') }),
                  BF.bindings({ '?b': DF.namedNode('ex:b3') }),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false }),
                type: 'bindings',
                variables: [ 'a', 'b' ],
              },
              operation: FACTORY.createPattern(DF.variable('a'), DF.namedNode('ex:p1'), DF.variable('b')),
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings({ '?a': DF.namedNode('ex:a1') }),
                  BF.bindings({ '?a': DF.namedNode('ex:a2') }),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 1, canContainUndefs: false }),
                type: 'bindings',
                variables: [ 'a' ],
              },
              operation: FACTORY.createPattern(DF.variable('a'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
            },
          ],
        };
        const { result } = await actor.getOutput(action);

        // Validate output
        expect(result.type).toEqual('bindings');
        expect(await arrayifyStream(result.bindingsStream)).toEqual([
          BF.bindings({ '?bound': DF.namedNode('ex:bound1'), '?a': DF.namedNode('ex:a1') }),
          BF.bindings({ '?bound': DF.namedNode('ex:bound2'), '?a': DF.namedNode('ex:a1') }),
          BF.bindings({ '?bound': DF.namedNode('ex:bound3'), '?a': DF.namedNode('ex:a1') }),
          BF.bindings({ '?bound': DF.namedNode('ex:bound1'), '?a': DF.namedNode('ex:a2') }),
          BF.bindings({ '?bound': DF.namedNode('ex:bound2'), '?a': DF.namedNode('ex:a2') }),
          BF.bindings({ '?bound': DF.namedNode('ex:bound3'), '?a': DF.namedNode('ex:a2') }),
        ]);
        expect(result.variables).toEqual([ 'a', 'b' ]);
        expect(await result.metadata()).toEqual({ cardinality: 2.400_000_000_000_000_4, canContainUndefs: false });
      });

      it('should handle three entries (depth-first)', async() => {
        const action: IActionRdfJoin = {
          context,
          type: 'inner',
          entries: [
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings({ '?b': DF.namedNode('ex:b1') }),
                  BF.bindings({ '?b': DF.namedNode('ex:b2') }),
                  BF.bindings({ '?b': DF.namedNode('ex:b3') }),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false }),
                type: 'bindings',
                variables: [ 'a', 'b' ],
              },
              operation: FACTORY.createPattern(DF.variable('a'), DF.namedNode('ex:p1'), DF.variable('b')),
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings({ '?c': DF.namedNode('ex:c1') }),
                  BF.bindings({ '?c': DF.namedNode('ex:c2') }),
                  BF.bindings({ '?c': DF.namedNode('ex:c3') }),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 4, canContainUndefs: false }),
                type: 'bindings',
                variables: [ 'a', 'c' ],
              },
              operation: FACTORY.createPattern(DF.variable('a'), DF.namedNode('ex:p2'), DF.variable('c')),
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings({ '?a': DF.namedNode('ex:a1') }),
                  BF.bindings({ '?a': DF.namedNode('ex:a2') }),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 1, canContainUndefs: false }),
                type: 'bindings',
                variables: [ 'a' ],
              },
              operation: FACTORY.createPattern(DF.variable('a'), DF.namedNode('ex:p2'), DF.namedNode('ex:o')),
            },
          ],
        };
        const { result } = await actor.getOutput(action);

        // Validate output
        expect(result.type).toEqual('bindings');
        expect(await arrayifyStream(result.bindingsStream)).toEqual([
          BF.bindings({ '?bound': DF.namedNode('ex:bound1'), '?a': DF.namedNode('ex:a1') }),
          BF.bindings({ '?bound': DF.namedNode('ex:bound2'), '?a': DF.namedNode('ex:a1') }),
          BF.bindings({ '?bound': DF.namedNode('ex:bound3'), '?a': DF.namedNode('ex:a1') }),
          BF.bindings({ '?bound': DF.namedNode('ex:bound1'), '?a': DF.namedNode('ex:a2') }),
          BF.bindings({ '?bound': DF.namedNode('ex:bound2'), '?a': DF.namedNode('ex:a2') }),
          BF.bindings({ '?bound': DF.namedNode('ex:bound3'), '?a': DF.namedNode('ex:a2') }),
        ]);
        expect(result.variables).toEqual([ 'a', 'b', 'c' ]);
        expect(await result.metadata()).toEqual({ cardinality: 9.600_000_000_000_001, canContainUndefs: false });

        // Validate mock calls
        expect(logSpy).toHaveBeenCalledWith(context, 'First entry for Bind Join: ', expect.any(Function));
        expect(logSpy.mock.calls[0][2]()).toEqual({
          entry: action.entries[2].operation,
          metadata: { cardinality: 1, canContainUndefs: false },
        });
        expect(mediatorQueryOperation.mediate).toHaveBeenCalledTimes(2);
        expect(mediatorQueryOperation.mediate).toHaveBeenNthCalledWith(1, {
          operation: FACTORY.createJoin([
            FACTORY.createPattern(DF.namedNode('ex:a1'), DF.namedNode('ex:p1'), DF.variable('b')),
            FACTORY.createPattern(DF.namedNode('ex:a1'), DF.namedNode('ex:p2'), DF.variable('c')),
          ]),
          context: new ActionContext({
            a: 'b',
            [KeysQueryOperation.joinLeftMetadata.name]: { cardinality: 1, canContainUndefs: false },
            [KeysQueryOperation.joinRightMetadatas.name]: [
              { cardinality: 3, canContainUndefs: false },
              { cardinality: 4, canContainUndefs: false },
            ],
            [KeysQueryOperation.joinBindings.name]: BF.bindings({ '?a': DF.namedNode('ex:a1') }),
          }),
        });
        expect(mediatorQueryOperation.mediate).toHaveBeenNthCalledWith(2, {
          operation: FACTORY.createJoin([
            FACTORY.createPattern(DF.namedNode('ex:a2'), DF.namedNode('ex:p1'), DF.variable('b')),
            FACTORY.createPattern(DF.namedNode('ex:a2'), DF.namedNode('ex:p2'), DF.variable('c')),
          ]),
          context: new ActionContext({
            a: 'b',
            [KeysQueryOperation.joinLeftMetadata.name]: { cardinality: 1, canContainUndefs: false },
            [KeysQueryOperation.joinRightMetadatas.name]: [
              { cardinality: 3, canContainUndefs: false },
              { cardinality: 4, canContainUndefs: false },
            ],
            [KeysQueryOperation.joinBindings.name]: BF.bindings({ '?a': DF.namedNode('ex:a2') }),
          }),
        });
      });
    });
  });
});
