import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import type { IActionRdfJoinSelectivity, IActorRdfJoinSelectivityOutput } from '@comunica/bus-rdf-join-selectivity';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import { Bus } from '@comunica/core';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorRdfJoinMinusHash } from '../lib/ActorRdfJoinMinusHash';
const arrayifyStream = require('arrayify-stream');

const DF = new DataFactory();
const BF = new BindingsFactory();

describe('ActorRdfJoinMinusHash', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfJoinMinusHash instance', () => {
    let mediatorJoinSelectivity: Mediator<
    Actor<IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>,
    IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>;
    let actor: ActorRdfJoinMinusHash;

    beforeEach(() => {
      mediatorJoinSelectivity = <any> {
        mediate: async() => ({ selectivity: 1 }),
      };
      actor = new ActorRdfJoinMinusHash({ name: 'actor', bus, mediatorJoinSelectivity });
    });

    describe('test', () => {
      it('should not test on zero entries', async() => {
        await expect(actor.test({
          type: 'minus',
          entries: [],
        })).rejects.toThrow('actor requires at least two join entries.');
      });

      it('should not test on one entry', async() => {
        await expect(actor.test({
          type: 'minus',
          entries: <any> [{}],
        })).rejects.toThrow('actor requires at least two join entries.');
      });

      it('should not test on three entries', async() => {
        await expect(actor.test({
          type: 'minus',
          entries: <any> [{}, {}, {}],
        })).rejects.toThrow('actor requires 2 join entries at most. The input contained 3.');
      });

      it('should not test on a non-minus operation', async() => {
        await expect(actor.test({
          type: 'inner',
          entries: <any> [{}, {}],
        })).rejects.toThrow(`actor can only handle logical joins of type 'minus', while 'inner' was given.`);
      });

      it('should not test on two entries with undefs', async() => {
        await expect(actor.test({
          type: 'minus',
          entries: <any> [
            {
              output: {
                type: 'bindings',
                metadata: () => Promise.resolve(
                  { cardinality: 4, pageSize: 100, requestTime: 10, canContainUndefs: true },
                ),
              },
            },
            {
              output: {
                type: 'bindings',
                metadata: () => Promise.resolve(
                  { cardinality: 4, pageSize: 100, requestTime: 10, canContainUndefs: true },
                ),
              },
            },
          ],
        })).rejects.toThrowError('Actor actor can not join streams containing undefs');
      });

      it('should test on two entries', async() => {
        expect(await actor.test({
          type: 'minus',
          entries: <any> [
            {
              output: {
                type: 'bindings',
                metadata: () => Promise.resolve(
                  { cardinality: 4, pageSize: 100, requestTime: 10, canContainUndefs: false },
                ),
              },
            },
            {
              output: {
                type: 'bindings',
                metadata: () => Promise.resolve(
                  { cardinality: 4, pageSize: 100, requestTime: 10, canContainUndefs: false },
                ),
              },
            },
          ],
        })).toEqual({
          iterations: 8,
          blockingItems: 4,
          persistedItems: 4,
          requestTime: 0.8,
        });
      });
    });

    describe('getOutput', () => {
      it('should handle entries with common variables', async() => {
        const action: IActionRdfJoin = {
          type: 'minus',
          entries: [
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings({ a: DF.literal('1') }),
                  BF.bindings({ a: DF.literal('2') }),
                  BF.bindings({ a: DF.literal('3') }),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false }),
                type: 'bindings',
                variables: [ 'a' ],
              },
              operation: <any> {},
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings({ a: DF.literal('1') }),
                  BF.bindings({ a: DF.literal('2') }),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 2, canContainUndefs: false }),
                type: 'bindings',
                variables: [ 'a' ],
              },
              operation: <any> {},
            },
          ],
        };
        const { result } = await actor.getOutput(action);

        // Validate output
        expect(result.type).toEqual('bindings');
        expect(await result.metadata()).toEqual({ cardinality: 3, canContainUndefs: false });
        expect(await arrayifyStream(result.bindingsStream)).toEqual([
          BF.bindings({ a: DF.literal('3') }),
        ]);
        expect(result.variables).toEqual([ 'a' ]);
      });

      it('should handle entries without common variables', async() => {
        const action: IActionRdfJoin = {
          type: 'minus',
          entries: [
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings({ a: DF.literal('1') }),
                  BF.bindings({ a: DF.literal('2') }),
                  BF.bindings({ a: DF.literal('3') }),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false }),
                type: 'bindings',
                variables: [ 'a' ],
              },
              operation: <any> {},
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings({ b: DF.literal('1') }),
                  BF.bindings({ b: DF.literal('2') }),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 2, canContainUndefs: false }),
                type: 'bindings',
                variables: [ 'b' ],
              },
              operation: <any> {},
            },
          ],
        };
        const { result } = await actor.getOutput(action);

        // Validate output
        expect(result.type).toEqual('bindings');
        expect(await result.metadata()).toEqual({ cardinality: 3, canContainUndefs: false });
        expect(await arrayifyStream(result.bindingsStream)).toEqual([
          BF.bindings({ a: DF.literal('1') }),
          BF.bindings({ a: DF.literal('2') }),
          BF.bindings({ a: DF.literal('3') }),
        ]);
        expect(result.variables).toEqual([ 'a' ]);
      });
    });
  });
});
