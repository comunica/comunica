import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import type { IActionRdfJoinSelectivity, IActorRdfJoinSelectivityOutput } from '@comunica/bus-rdf-join-selectivity';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorRdfJoinMinusHashUndef } from '../lib/ActorRdfJoinMinusHashUndef';
const arrayifyStream = require('arrayify-stream');

const DF = new DataFactory();
const BF = new BindingsFactory();

describe('ActorRdfJoinMinusHashUndef', () => {
  let bus: any;
  let left: any;
  let right: any;
  let rightNoCommons: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
    left = {
      metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false }),
      stream: new ArrayIterator([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]),
      type: 'bindings',
      variables: [ DF.variable('a') ],
    };
    rightNoCommons = {
      metadata: () => Promise.resolve({ cardinality: 2, canContainUndefs: false }),
      stream: new ArrayIterator([
        BF.bindings([[ DF.variable('b'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('b'), DF.literal('2') ]]),
      ]),
      type: 'bindings',
      variables: [ DF.variable('b') ],
    };
    right = {
      metadata: () => Promise.resolve({ cardinality: 2, canContainUndefs: false }),
      stream: new ArrayIterator([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
      ]),
      type: 'bindings',
      variables: [ DF.variable('a') ],
    };
  });

  describe('An ActorRdfJoinMinusHashUndef instance', () => {
    let mediatorJoinSelectivity: Mediator<
    Actor<IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>,
    IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>;
    let actor: ActorRdfJoinMinusHashUndef;

    beforeEach(() => {
      mediatorJoinSelectivity = <any> {
        mediate: async() => ({ selectivity: 1 }),
      };
      actor = new ActorRdfJoinMinusHashUndef({ name: 'actor', bus, mediatorJoinSelectivity });
    });

    describe('test', () => {
      it('should not test on zero entries', async() => {
        await expect(actor.test({
          type: 'minus',
          entries: [],
          context,
        })).rejects.toThrow('actor requires at least two join entries.');
      });

      it('should not test on one entry', async() => {
        await expect(actor.test({
          type: 'minus',
          entries: <any> [{}],
          context,
        })).rejects.toThrow('actor requires at least two join entries.');
      });

      it('should not test on three entries', async() => {
        await expect(actor.test({
          type: 'minus',
          entries: <any> [{}, {}, {}],
          context,
        })).rejects.toThrow('actor requires 2 join entries at most. The input contained 3.');
      });

      it('should not test on a non-minus operation', async() => {
        await expect(actor.test({
          type: 'inner',
          entries: <any> [{}, {}],
          context,
        })).rejects.toThrow(`actor can only handle logical joins of type 'minus', while 'inner' was given.`);
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
          context,
        })).toEqual({
          iterations: 8.08,
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
                  BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false }),
                type: 'bindings',
                variables: [ DF.variable('a') ],
              },
              operation: <any> {},
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 2, canContainUndefs: false }),
                type: 'bindings',
                variables: [ DF.variable('a') ],
              },
              operation: <any> {},
            },
          ],
          context,
        };
        const { result } = await actor.getOutput(action);

        // Validate output
        expect(result.type).toEqual('bindings');
        expect(await result.metadata()).toEqual({ cardinality: 3, canContainUndefs: false });
        await expect(result.bindingsStream).toEqualBindingsStream([
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ]);
        expect(result.variables).toEqual([ DF.variable('a') ]);
      });

      it('should handle entries without common variables', async() => {
        const action: IActionRdfJoin = {
          type: 'minus',
          entries: [
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false }),
                type: 'bindings',
                variables: [ DF.variable('a') ],
              },
              operation: <any> {},
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([[ DF.variable('b'), DF.literal('1') ]]),
                  BF.bindings([[ DF.variable('b'), DF.literal('2') ]]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 2, canContainUndefs: false }),
                type: 'bindings',
                variables: [ DF.variable('b') ],
              },
              operation: <any> {},
            },
          ],
          context,
        };
        const { result } = await actor.getOutput(action);

        // Validate output
        expect(result.type).toEqual('bindings');
        expect(await result.metadata()).toEqual({ cardinality: 3, canContainUndefs: false });
        await expect(result.bindingsStream).toEqualBindingsStream([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ]);
        expect(result.variables).toEqual([ DF.variable('a') ]);
      });

      it('should handle undef in right entry', async() => {
        const action: IActionRdfJoin = {
          type: 'minus',
          entries: [
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('1') ],
                    [ DF.variable('b'), DF.literal('1') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('2') ],
                    [ DF.variable('b'), DF.literal('2') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('3') ],
                    [ DF.variable('b'), DF.literal('3') ],
                  ]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false }),
                type: 'bindings',
                variables: [ DF.variable('a'), DF.variable('b') ],
              },
              operation: <any> {},
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('1') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('b'), DF.literal('3') ],
                  ]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 2, canContainUndefs: false }),
                type: 'bindings',
                variables: [ DF.variable('a'), DF.variable('b') ],
              },
              operation: <any> {},
            },
          ],
          context,
        };
        const { result } = await actor.getOutput(action);

        // Validate output
        expect(result.type).toEqual('bindings');
        expect(await result.metadata()).toEqual({ cardinality: 3, canContainUndefs: false });
        await expect(result.bindingsStream).toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('a'), DF.literal('2') ],
            [ DF.variable('b'), DF.literal('2') ],
          ]),
        ]);
        expect(result.variables).toEqual([ DF.variable('a'), DF.variable('b') ]);
      });

      it('should handle undef in left entry', async() => {
        const action: IActionRdfJoin = {
          type: 'minus',
          entries: [
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('1') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('2') ],
                    [ DF.variable('b'), DF.literal('2') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('b'), DF.literal('3') ],
                  ]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: true }),
                type: 'bindings',
                variables: [ DF.variable('a'), DF.variable('b') ],
              },
              operation: <any> {},
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('1') ],
                    [ DF.variable('b'), DF.literal('1') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('3') ],
                    [ DF.variable('b'), DF.literal('3') ],
                  ]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 2, canContainUndefs: false }),
                type: 'bindings',
                variables: [ DF.variable('a'), DF.variable('b') ],
              },
              operation: <any> {},
            },
          ],
          context,
        };
        const { result } = await actor.getOutput(action);

        // Validate output
        expect(result.type).toEqual('bindings');
        expect(await result.metadata()).toEqual({ cardinality: 3, canContainUndefs: true });
        await expect(result.bindingsStream).toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('a'), DF.literal('2') ],
            [ DF.variable('b'), DF.literal('2') ],
          ]),
        ]);
        expect(result.variables).toEqual([ DF.variable('a'), DF.variable('b') ]);
      });

      it('should handle undef in left and right entry', async() => {
        const action: IActionRdfJoin = {
          type: 'minus',
          entries: [
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('1') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('2') ],
                    [ DF.variable('b'), DF.literal('2') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('b'), DF.literal('3') ],
                  ]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: true }),
                type: 'bindings',
                variables: [ DF.variable('a'), DF.variable('b') ],
              },
              operation: <any> {},
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('1') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('3') ],
                  ]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 2, canContainUndefs: true }),
                type: 'bindings',
                variables: [ DF.variable('a'), DF.variable('b') ],
              },
              operation: <any> {},
            },
          ],
          context,
        };
        const { result } = await actor.getOutput(action);

        // Validate output
        expect(result.type).toEqual('bindings');
        expect(await result.metadata()).toEqual({ cardinality: 3, canContainUndefs: true });
        await expect(result.bindingsStream).toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('a'), DF.literal('2') ],
            [ DF.variable('b'), DF.literal('2') ],
          ]),
        ]);
        expect(result.variables).toEqual([ DF.variable('a'), DF.variable('b') ]);
      });
    });
  });
});
