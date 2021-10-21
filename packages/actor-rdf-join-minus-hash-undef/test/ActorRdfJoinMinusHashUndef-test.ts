import { Bindings } from '@comunica/bus-query-operation';
import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import type { IActionRdfJoinSelectivity, IActorRdfJoinSelectivityOutput } from '@comunica/bus-rdf-join-selectivity';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import { Bus } from '@comunica/core';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorRdfJoinMinusHashUndef } from '../lib/ActorRdfJoinMinusHashUndef';
const arrayifyStream = require('arrayify-stream');
const DF = new DataFactory();

describe('ActorRdfJoinMinusHashUndef', () => {
  let bus: any;
  let left: any;
  let right: any;
  let rightNoCommons: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    left = {
      metadata: () => Promise.resolve({ cardinality: 3 }),
      stream: new ArrayIterator([
        Bindings({ a: DF.literal('1') }),
        Bindings({ a: DF.literal('2') }),
        Bindings({ a: DF.literal('3') }),
      ]),
      type: 'bindings',
      variables: [ 'a' ],
      canContainUndefs: false,
    };
    rightNoCommons = {
      metadata: () => Promise.resolve({ cardinality: 2 }),
      stream: new ArrayIterator([
        Bindings({ b: DF.literal('1') }),
        Bindings({ b: DF.literal('2') }),
      ]),
      type: 'bindings',
      variables: [ 'b' ],
      canContainUndefs: false,
    };
    right = {
      metadata: () => Promise.resolve({ cardinality: 2 }),
      stream: new ArrayIterator([
        Bindings({ a: DF.literal('1') }),
        Bindings({ a: DF.literal('2') }),
      ]),
      type: 'bindings',
      variables: [ 'a' ],
      canContainUndefs: false,
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

      it('should test on two entries', async() => {
        expect(await actor.test({
          type: 'minus',
          entries: <any> [
            {
              output: {
                type: 'bindings',
                metadata: () => Promise.resolve({ cardinality: 4, pageSize: 100, requestTime: 10 }),
              },
            },
            {
              output: {
                type: 'bindings',
                metadata: () => Promise.resolve({ cardinality: 4, pageSize: 100, requestTime: 10 }),
              },
            },
          ],
        })).toEqual({
          iterations: 8.08,
          blockingItems: 4,
          persistedItems: 4,
          requestTime: 3.2,
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
                  Bindings({ a: DF.literal('1') }),
                  Bindings({ a: DF.literal('2') }),
                  Bindings({ a: DF.literal('3') }),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 3 }),
                type: 'bindings',
                variables: [ 'a' ],
                canContainUndefs: false,
              },
              operation: <any> {},
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  Bindings({ a: DF.literal('1') }),
                  Bindings({ a: DF.literal('2') }),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 2 }),
                type: 'bindings',
                variables: [ 'a' ],
                canContainUndefs: false,
              },
              operation: <any> {},
            },
          ],
        };
        const { result } = await actor.getOutput(action);

        // Validate output
        expect(result.type).toEqual('bindings');
        expect(await result.metadata!()).toEqual({ cardinality: 3 });
        expect(await arrayifyStream(result.bindingsStream)).toEqual([
          Bindings({ a: DF.literal('3') }),
        ]);
        expect(result.variables).toEqual([ 'a' ]);
        expect(result.canContainUndefs).toEqual(false);
      });

      it('should handle entries without common variables', async() => {
        const action: IActionRdfJoin = {
          type: 'minus',
          entries: [
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  Bindings({ a: DF.literal('1') }),
                  Bindings({ a: DF.literal('2') }),
                  Bindings({ a: DF.literal('3') }),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 3 }),
                type: 'bindings',
                variables: [ 'a' ],
                canContainUndefs: false,
              },
              operation: <any> {},
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  Bindings({ b: DF.literal('1') }),
                  Bindings({ b: DF.literal('2') }),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 2 }),
                type: 'bindings',
                variables: [ 'b' ],
                canContainUndefs: false,
              },
              operation: <any> {},
            },
          ],
        };
        const { result } = await actor.getOutput(action);

        // Validate output
        expect(result.type).toEqual('bindings');
        expect(await result.metadata!()).toEqual({ cardinality: 3 });
        expect(await arrayifyStream(result.bindingsStream)).toEqual([
          Bindings({ a: DF.literal('1') }),
          Bindings({ a: DF.literal('2') }),
          Bindings({ a: DF.literal('3') }),
        ]);
        expect(result.variables).toEqual([ 'a' ]);
        expect(result.canContainUndefs).toEqual(false);
      });

      it('should handle undef in right entry', async() => {
        const action: IActionRdfJoin = {
          type: 'minus',
          entries: [
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  Bindings({
                    a: DF.literal('1'),
                    b: DF.literal('1'),
                  }),
                  Bindings({
                    a: DF.literal('2'),
                    b: DF.literal('2'),
                  }),
                  Bindings({
                    a: DF.literal('3'),
                    b: DF.literal('3'),
                  }),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 3 }),
                type: 'bindings',
                variables: [ 'a', 'b' ],
                canContainUndefs: false,
              },
              operation: <any> {},
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  Bindings({
                    a: DF.literal('1'),
                  }),
                  Bindings({
                    b: DF.literal('3'),
                  }),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 2 }),
                type: 'bindings',
                variables: [ 'a', 'b' ],
                canContainUndefs: true,
              },
              operation: <any> {},
            },
          ],
        };
        const { result } = await actor.getOutput(action);

        // Validate output
        expect(result.type).toEqual('bindings');
        expect(await result.metadata!()).toEqual({ cardinality: 3 });
        expect(await arrayifyStream(result.bindingsStream)).toEqual([
          Bindings({
            a: DF.literal('2'),
            b: DF.literal('2'),
          }),
        ]);
        expect(result.variables).toEqual([ 'a', 'b' ]);
        expect(result.canContainUndefs).toEqual(true);
      });

      it('should handle undef in left entry', async() => {
        const action: IActionRdfJoin = {
          type: 'minus',
          entries: [
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  Bindings({
                    a: DF.literal('1'),
                  }),
                  Bindings({
                    a: DF.literal('2'),
                    b: DF.literal('2'),
                  }),
                  Bindings({
                    b: DF.literal('3'),
                  }),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 3 }),
                type: 'bindings',
                variables: [ 'a', 'b' ],
                canContainUndefs: true,
              },
              operation: <any> {},
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  Bindings({
                    a: DF.literal('1'),
                    b: DF.literal('1'),
                  }),
                  Bindings({
                    a: DF.literal('3'),
                    b: DF.literal('3'),
                  }),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 2 }),
                type: 'bindings',
                variables: [ 'a', 'b' ],
                canContainUndefs: false,
              },
              operation: <any> {},
            },
          ],
        };
        const { result } = await actor.getOutput(action);

        // Validate output
        expect(result.type).toEqual('bindings');
        expect(await result.metadata!()).toEqual({ cardinality: 3 });
        expect(await arrayifyStream(result.bindingsStream)).toEqual([
          Bindings({
            a: DF.literal('2'),
            b: DF.literal('2'),
          }),
        ]);
        expect(result.variables).toEqual([ 'a', 'b' ]);
        expect(result.canContainUndefs).toEqual(true);
      });

      it('should handle undef in left and right entry', async() => {
        const action: IActionRdfJoin = {
          type: 'minus',
          entries: [
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  Bindings({
                    a: DF.literal('1'),
                  }),
                  Bindings({
                    a: DF.literal('2'),
                    b: DF.literal('2'),
                  }),
                  Bindings({
                    b: DF.literal('3'),
                  }),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 3 }),
                type: 'bindings',
                variables: [ 'a', 'b' ],
                canContainUndefs: true,
              },
              operation: <any> {},
            },
            {
              output: <any> {
                bindingsStream: new ArrayIterator([
                  Bindings({
                    a: DF.literal('1'),
                  }),
                  Bindings({
                    a: DF.literal('3'),
                  }),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({ cardinality: 2 }),
                type: 'bindings',
                variables: [ 'a', 'b' ],
                canContainUndefs: true,
              },
              operation: <any> {},
            },
          ],
        };
        const { result } = await actor.getOutput(action);

        // Validate output
        expect(result.type).toEqual('bindings');
        expect(await result.metadata!()).toEqual({ cardinality: 3 });
        expect(await arrayifyStream(result.bindingsStream)).toEqual([
          Bindings({
            a: DF.literal('2'),
            b: DF.literal('2'),
          }),
        ]);
        expect(result.variables).toEqual([ 'a', 'b' ]);
        expect(result.canContainUndefs).toEqual(true);
      });
    });
  });
});
