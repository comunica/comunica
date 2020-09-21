import { ActorRdfJoinNestedLoop } from '@comunica/actor-rdf-join-nestedloop';
import { Bindings } from '@comunica/bus-query-operation';
import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import { Bus } from '@comunica/core';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorRdfJoinMultiSequential } from '../lib/ActorRdfJoinMultiSequential';
const arrayifyStream = require('arrayify-stream');
const DF = new DataFactory();

describe('ActorRdfJoinMultiSequential', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfJoinMultiSequential module', () => {
    it('should be a function', () => {
      expect(ActorRdfJoinMultiSequential).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfJoinMultiSequential constructor', () => {
      expect(new (<any> ActorRdfJoinMultiSequential)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfJoinMultiSequential);
      expect(new (<any> ActorRdfJoinMultiSequential)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfJoin);
    });

    it('should not be able to create new ActorRdfJoinMultiSequential objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfJoinMultiSequential)(); }).toThrow();
    });
  });

  describe('An ActorRdfJoinMultiSequential instance', () => {
    let mediatorJoin: any;
    let actor: ActorRdfJoinMultiSequential;
    let action3: IActionRdfJoin;
    let action4: IActionRdfJoin;
    let invocationCounter: any;

    beforeEach(() => {
      invocationCounter = 0;
      mediatorJoin = {
        mediate(a: any) {
          if (a.entries.length === 2) {
            a.entries[0].called = invocationCounter;
            a.entries[1].called = invocationCounter;
            invocationCounter++;
            return new ActorRdfJoinNestedLoop({ name: 'actor', bus }).run(a);
          }
          return actor.run(a);
        },
      };
      actor = new ActorRdfJoinMultiSequential({ name: 'actor', bus, mediatorJoin });
      action3 = {
        entries: [
          {
            bindingsStream: new ArrayIterator([
              Bindings({ a: DF.literal('a1'), b: DF.literal('b1') }),
              Bindings({ a: DF.literal('a2'), b: DF.literal('b2') }),
            ]),
            metadata: () => Promise.resolve({ totalItems: 4 }),
            type: 'bindings',
            variables: [ 'a', 'b' ],
            canContainUndefs: false,
          },
          {
            bindingsStream: new ArrayIterator([
              Bindings({ a: DF.literal('a1'), c: DF.literal('c1') }),
              Bindings({ a: DF.literal('a2'), c: DF.literal('c2') }),
            ]),
            metadata: () => Promise.resolve({ totalItems: 5 }),
            type: 'bindings',
            variables: [ 'a', 'c' ],
            canContainUndefs: false,
          },
          {
            bindingsStream: new ArrayIterator([
              Bindings({ a: DF.literal('a1'), b: DF.literal('b1') }),
              Bindings({ a: DF.literal('a2'), b: DF.literal('b2') }),
            ]),
            metadata: () => Promise.resolve({ totalItems: 2 }),
            type: 'bindings',
            variables: [ 'a', 'b' ],
            canContainUndefs: false,
          },
        ],
      };
      action4 = {
        entries: [
          {
            bindingsStream: new ArrayIterator([
              Bindings({ a: DF.literal('a1'), b: DF.literal('b1') }),
              Bindings({ a: DF.literal('a2'), b: DF.literal('b2') }),
            ]),
            metadata: () => Promise.resolve({ totalItems: 4 }),
            type: 'bindings',
            variables: [ 'a', 'b' ],
            canContainUndefs: false,
          },
          {
            bindingsStream: new ArrayIterator([
              Bindings({ a: DF.literal('a1'), c: DF.literal('c1') }),
              Bindings({ a: DF.literal('a2'), c: DF.literal('c2') }),
            ]),
            metadata: () => Promise.resolve({ totalItems: 5 }),
            type: 'bindings',
            variables: [ 'a', 'c' ],
            canContainUndefs: false,
          },
          {
            bindingsStream: new ArrayIterator([
              Bindings({ a: DF.literal('a1'), b: DF.literal('b1') }),
              Bindings({ a: DF.literal('a2'), b: DF.literal('b2') }),
            ]),
            metadata: () => Promise.resolve({ totalItems: 2 }),
            type: 'bindings',
            variables: [ 'a', 'b' ],
            canContainUndefs: false,
          },
          {
            bindingsStream: new ArrayIterator([
              Bindings({ a: DF.literal('a1'), d: DF.literal('d1') }),
              Bindings({ a: DF.literal('a2'), d: DF.literal('d2') }),
            ]),
            metadata: () => Promise.resolve({ totalItems: 2 }),
            type: 'bindings',
            variables: [ 'a', 'd' ],
            canContainUndefs: false,
          },
        ],
      };
    });

    it('should test on 0 streams', () => {
      return expect(actor.test({ entries: []})).resolves.toEqual({ iterations: 0 });
    });

    it('should test on 1 stream', () => {
      return expect(actor.test({ entries: [ <any> null ]})).resolves.toEqual({ iterations: 0 });
    });

    it('should not test on 2 streams', () => {
      return expect(actor.test({ entries: [ <any> null, <any> null ]})).rejects
        .toThrow(new Error('actor requires 3 sources at least. The input contained 2.'));
    });

    it('should test on 3 streams', () => {
      return expect(actor.test(action3)).resolves.toEqual({ iterations: 40 });
    });

    it('should test on 4 streams', () => {
      return expect(actor.test(action4)).resolves.toEqual({ iterations: 80 });
    });

    it('should run on 3 streams', async() => {
      const output = await actor.run(action3);
      expect(output.type).toEqual('bindings');
      expect(output.variables).toEqual([ 'a', 'b', 'c' ]);
      expect(await (<any> output).metadata()).toEqual({ totalItems: 40 });
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ a: DF.literal('a1'), b: DF.literal('b1'), c: DF.literal('c1') }),
        Bindings({ a: DF.literal('a2'), b: DF.literal('b2'), c: DF.literal('c2') }),
      ]);

      // Check join order
      expect((<any> action3.entries[0]).called).toBe(0);
      expect((<any> action3.entries[1]).called).toBe(0);
      expect((<any> action3.entries[2]).called).toBe(1);
    });

    it('should run on 4 streams', async() => {
      const output = await actor.run(action4);
      expect(output.type).toEqual('bindings');
      expect(output.variables).toEqual([ 'a', 'b', 'c', 'd' ]);
      expect(await (<any> output).metadata()).toEqual({ totalItems: 80 });
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ a: DF.literal('a1'), b: DF.literal('b1'), c: DF.literal('c1'), d: DF.literal('d1') }),
        Bindings({ a: DF.literal('a2'), b: DF.literal('b2'), c: DF.literal('c2'), d: DF.literal('d2') }),
      ]);

      // Check join order
      expect((<any> action4.entries[0]).called).toBe(0);
      expect((<any> action4.entries[1]).called).toBe(0);
      expect((<any> action4.entries[2]).called).toBe(1);
      expect((<any> action4.entries[3]).called).toBe(2);
    });
  });
});
