import { ActorRdfJoinNestedLoop } from '@comunica/actor-rdf-join-inner-nestedloop';
import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { IActionRdfJoinSelectivity, IActorRdfJoinSelectivityOutput } from '@comunica/bus-rdf-join-selectivity';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorRdfJoinMultiSmallest } from '../lib/ActorRdfJoinMultiSmallest';
const arrayifyStream = require('arrayify-stream');

const DF = new DataFactory();
const BF = new BindingsFactory();

describe('ActorRdfJoinMultiSmallest', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('The ActorRdfJoinMultiSmallest module', () => {
    it('should be a function', () => {
      expect(ActorRdfJoinMultiSmallest).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfJoinMultiSmallest constructor', () => {
      expect(new (<any> ActorRdfJoinMultiSmallest)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfJoinMultiSmallest);
      expect(new (<any> ActorRdfJoinMultiSmallest)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfJoin);
    });

    it('should not be able to create new ActorRdfJoinMultiSmallest objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfJoinMultiSmallest)(); }).toThrow();
    });
  });

  describe('An ActorRdfJoinMultiSmallest instance', () => {
    let mediatorJoinSelectivity: Mediator<
    Actor<IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>,
    IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>;
    let mediatorJoin: any;
    let actor: ActorRdfJoinMultiSmallest;
    let action3: IActionRdfJoin;
    let action4: IActionRdfJoin;
    let action3PartialMeta: IActionRdfJoin;
    let invocationCounter: any;

    beforeEach(() => {
      mediatorJoinSelectivity = <any> {
        mediate: async() => ({ selectivity: 1 }),
      };
      invocationCounter = 0;
      mediatorJoin = {
        mediate(a: any) {
          if (a.entries.length === 2) {
            a.entries[0].called = invocationCounter;
            a.entries[1].called = invocationCounter;
            invocationCounter++;
            return new ActorRdfJoinNestedLoop({ name: 'actor', bus, mediatorJoinSelectivity }).run(a);
          }
          return actor.run(a);
        },
      };
      actor = new ActorRdfJoinMultiSmallest({ name: 'actor', bus, mediatorJoin, mediatorJoinSelectivity });
      action3 = {
        type: 'inner',
        entries: [
          {
            output: {
              bindingsStream: new ArrayIterator([
                BF.bindings({ a: DF.literal('a1'), b: DF.literal('b1') }),
                BF.bindings({ a: DF.literal('a2'), b: DF.literal('b2') }),
              ]),
              metadata: () => Promise.resolve(
                { cardinality: 4, pageSize: 100, requestTime: 10, canContainUndefs: false },
              ),
              type: 'bindings',
              variables: [ 'a', 'b' ],
            },
            operation: <any> {},
          },
          {
            output: {
              bindingsStream: new ArrayIterator([
                BF.bindings({ a: DF.literal('a1'), c: DF.literal('c1') }),
                BF.bindings({ a: DF.literal('a2'), c: DF.literal('c2') }),
              ]),
              metadata: () => Promise.resolve(
                { cardinality: 5, pageSize: 100, requestTime: 20, canContainUndefs: false },
              ),
              type: 'bindings',
              variables: [ 'a', 'c' ],
            },
            operation: <any> {},
          },
          {
            output: {
              bindingsStream: new ArrayIterator([
                BF.bindings({ a: DF.literal('a1'), b: DF.literal('b1') }),
                BF.bindings({ a: DF.literal('a2'), b: DF.literal('b2') }),
              ]),
              metadata: () => Promise.resolve(
                { cardinality: 2, pageSize: 100, requestTime: 30, canContainUndefs: false },
              ),
              type: 'bindings',
              variables: [ 'a', 'b' ],
            },
            operation: <any> {},
          },
        ],
        context,
      };
      action4 = {
        type: 'inner',
        entries: [
          {
            output: {
              bindingsStream: new ArrayIterator([
                BF.bindings({ a: DF.literal('a1'), b: DF.literal('b1') }),
                BF.bindings({ a: DF.literal('a2'), b: DF.literal('b2') }),
              ]),
              metadata: () => Promise.resolve(
                { cardinality: 4, pageSize: 100, requestTime: 10, canContainUndefs: false },
              ),
              type: 'bindings',
              variables: [ 'a', 'b' ],
            },
            operation: <any> {},
          },
          {
            output: {
              bindingsStream: new ArrayIterator([
                BF.bindings({ a: DF.literal('a1'), c: DF.literal('c1') }),
                BF.bindings({ a: DF.literal('a2'), c: DF.literal('c2') }),
              ]),
              metadata: () => Promise.resolve(
                { cardinality: 5, pageSize: 100, requestTime: 20, canContainUndefs: false },
              ),
              type: 'bindings',
              variables: [ 'a', 'c' ],
            },
            operation: <any> {},
          },
          {
            output: {
              bindingsStream: new ArrayIterator([
                BF.bindings({ a: DF.literal('a1'), b: DF.literal('b1') }),
                BF.bindings({ a: DF.literal('a2'), b: DF.literal('b2') }),
              ]),
              metadata: () => Promise.resolve(
                { cardinality: 2, pageSize: 100, requestTime: 30, canContainUndefs: false },
              ),
              type: 'bindings',
              variables: [ 'a', 'b' ],
            },
            operation: <any> {},
          },
          {
            output: {
              bindingsStream: new ArrayIterator([
                BF.bindings({ a: DF.literal('a1'), d: DF.literal('d1') }),
                BF.bindings({ a: DF.literal('a2'), d: DF.literal('d2') }),
              ]),
              metadata: () => Promise.resolve(
                { cardinality: 2, pageSize: 100, requestTime: 40, canContainUndefs: false },
              ),
              type: 'bindings',
              variables: [ 'a', 'd' ],
            },
            operation: <any> {},
          },
        ],
        context,
      };
      action3PartialMeta = {
        type: 'inner',
        entries: [
          {
            output: {
              bindingsStream: new ArrayIterator([
                BF.bindings({ a: DF.literal('a1'), b: DF.literal('b1') }),
                BF.bindings({ a: DF.literal('a2'), b: DF.literal('b2') }),
              ]),
              metadata: () => Promise.resolve(
                { cardinality: 4, pageSize: 100, requestTime: 10, canContainUndefs: false },
              ),
              type: 'bindings',
              variables: [ 'a', 'b' ],
            },
            operation: <any> {},
          },
          {
            output: {
              bindingsStream: new ArrayIterator([
                BF.bindings({ a: DF.literal('a1'), c: DF.literal('c1') }),
                BF.bindings({ a: DF.literal('a2'), c: DF.literal('c2') }),
              ]),
              metadata: () => Promise.resolve({ cardinality: 2, canContainUndefs: false }),
              type: 'bindings',
              variables: [ 'a', 'c' ],
            },
            operation: <any> {},
          },
          {
            output: {
              bindingsStream: new ArrayIterator([
                BF.bindings({ a: DF.literal('a1'), b: DF.literal('b1') }),
                BF.bindings({ a: DF.literal('a2'), b: DF.literal('b2') }),
              ]),
              metadata: () => Promise.resolve(
                { cardinality: 2, pageSize: 100, requestTime: 30, canContainUndefs: false },
              ),
              type: 'bindings',
              variables: [ 'a', 'b' ],
            },
            operation: <any> {},
          },
        ],
        context,
      };
    });

    it('should not test on 0 streams', () => {
      return expect(actor.test({ type: 'inner', entries: [], context })).rejects
        .toThrow(new Error('actor requires at least two join entries.'));
    });

    it('should not test on 1 stream', () => {
      return expect(actor.test({ type: 'inner', entries: [ <any> null ], context })).rejects
        .toThrow(new Error('actor requires at least two join entries.'));
    });

    it('should not test on 2 streams', () => {
      return expect(actor.test({ type: 'inner', entries: [ <any> null, <any> null ], context })).rejects
        .toThrow(new Error('actor requires 3 join entries at least. The input contained 2.'));
    });

    it('should test on 3 streams', () => {
      return expect(actor.test(action3)).resolves.toEqual({
        iterations: 40,
        persistedItems: 0,
        blockingItems: 0,
        requestTime: 2,
      });
    });

    it('should test on 4 streams', () => {
      return expect(actor.test(action4)).resolves.toEqual({
        iterations: 80,
        persistedItems: 0,
        blockingItems: 0,
        requestTime: 2.8,
      });
    });

    it('should run on 3 streams', async() => {
      const output = await actor.run(action3);
      expect(output.type).toEqual('bindings');
      expect(output.variables).toEqual([ 'a', 'c', 'b' ]);
      expect(await (<any> output).metadata()).toEqual({ cardinality: 40, canContainUndefs: false });
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        BF.bindings({ a: DF.literal('a1'), b: DF.literal('b1'), c: DF.literal('c1') }),
        BF.bindings({ a: DF.literal('a2'), b: DF.literal('b2'), c: DF.literal('c2') }),
      ]);

      // Check join order
      expect((<any> action3.entries[0]).called).toBe(0);
      expect((<any> action3.entries[1]).called).toBe(1);
      expect((<any> action3.entries[2]).called).toBe(0);
    });

    it('should run on 4 streams', async() => {
      const output = await actor.run(action4);
      expect(output.type).toEqual('bindings');
      expect(output.variables).toEqual([ 'a', 'c', 'b', 'd' ]);
      expect(await (<any> output).metadata()).toEqual({ cardinality: 80, canContainUndefs: false });
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        BF.bindings({ a: DF.literal('a1'), b: DF.literal('b1'), c: DF.literal('c1'), d: DF.literal('d1') }),
        BF.bindings({ a: DF.literal('a2'), b: DF.literal('b2'), c: DF.literal('c2'), d: DF.literal('d2') }),
      ]);

      // Check join order
      expect((<any> action4.entries[0]).called).toBe(1);
      expect((<any> action4.entries[1]).called).toBe(2);
      expect((<any> action4.entries[2]).called).toBe(0);
      expect((<any> action4.entries[3]).called).toBe(0);
    });
  });
});
