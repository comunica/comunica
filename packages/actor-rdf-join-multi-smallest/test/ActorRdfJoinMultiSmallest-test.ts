import {ActorRdfJoinNestedLoop} from "@comunica/actor-rdf-join-nestedloop";
import {Bindings} from "@comunica/bus-query-operation";
import {ActorRdfJoin, IActionRdfJoin} from "@comunica/bus-rdf-join";
import {Bus} from "@comunica/core";
import {literal} from "@rdfjs/data-model";
import {ArrayIterator} from "asynciterator";
import {ActorRdfJoinMultiSmallest} from "../lib/ActorRdfJoinMultiSmallest";
const arrayifyStream = require('arrayify-stream');

describe('ActorRdfJoinMultiSmallest', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
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
    let mediatorJoin: any;
    let actor: ActorRdfJoinMultiSmallest;
    let action3: IActionRdfJoin;
    let action4: IActionRdfJoin;
    let action3PartialMeta: IActionRdfJoin;
    let invocationCounter;

    beforeEach(() => {
      invocationCounter = 0;
      mediatorJoin = {
        mediate: (a) => {
          if (a.entries.length === 2) {
            a.entries[0].called = invocationCounter;
            a.entries[1].called = invocationCounter;
            invocationCounter++;
            return new ActorRdfJoinNestedLoop({ name: 'actor', bus }).run(a);
          } else {
            return actor.run(a);
          }
        },
      };
      actor = new ActorRdfJoinMultiSmallest({ name: 'actor', bus, mediatorJoin });
      action3 = {
        entries: [
          {
            bindingsStream: new ArrayIterator([
              Bindings({ a: literal('a1'), b: literal('b1')}),
              Bindings({ a: literal('a2'), b: literal('b2')}),
            ]),
            metadata: () => Promise.resolve({ totalItems: 4 }),
            type: 'bindings',
            variables: ['a', 'b'],
          },
          {
            bindingsStream: new ArrayIterator([
              Bindings({ a: literal('a1'), c: literal('c1')}),
              Bindings({ a: literal('a2'), c: literal('c2')}),
            ]),
            metadata: () => Promise.resolve({ totalItems: 5 }),
            type: 'bindings',
            variables: ['a', 'c'],
          },
          {
            bindingsStream: new ArrayIterator([
              Bindings({ a: literal('a1'), b: literal('b1')}),
              Bindings({ a: literal('a2'), b: literal('b2')}),
            ]),
            metadata: () => Promise.resolve({ totalItems: 2 }),
            type: 'bindings',
            variables: ['a', 'b'],
          },
        ],
      };
      action4 = {
        entries: [
          {
            bindingsStream: new ArrayIterator([
              Bindings({ a: literal('a1'), b: literal('b1')}),
              Bindings({ a: literal('a2'), b: literal('b2')}),
            ]),
            metadata: () => Promise.resolve({ totalItems: 4 }),
            type: 'bindings',
            variables: ['a', 'b'],
          },
          {
            bindingsStream: new ArrayIterator([
              Bindings({ a: literal('a1'), c: literal('c1')}),
              Bindings({ a: literal('a2'), c: literal('c2')}),
            ]),
            metadata: () => Promise.resolve({ totalItems: 5 }),
            type: 'bindings',
            variables: ['a', 'c'],
          },
          {
            bindingsStream: new ArrayIterator([
              Bindings({ a: literal('a1'), b: literal('b1')}),
              Bindings({ a: literal('a2'), b: literal('b2')}),
            ]),
            metadata: () => Promise.resolve({ totalItems: 2 }),
            type: 'bindings',
            variables: ['a', 'b'],
          },
          {
            bindingsStream: new ArrayIterator([
              Bindings({ a: literal('a1'), d: literal('d1')}),
              Bindings({ a: literal('a2'), d: literal('d2')}),
            ]),
            metadata: () => Promise.resolve({ totalItems: 2 }),
            type: 'bindings',
            variables: ['a', 'd'],
          },
        ],
      };
      action3PartialMeta = {
        entries: [
          {
            bindingsStream: new ArrayIterator([
              Bindings({ a: literal('a1'), b: literal('b1')}),
              Bindings({ a: literal('a2'), b: literal('b2')}),
            ]),
            metadata: () => Promise.resolve({ totalItems: 4 }),
            type: 'bindings',
            variables: ['a', 'b'],
          },
          {
            bindingsStream: new ArrayIterator([
              Bindings({ a: literal('a1'), c: literal('c1')}),
              Bindings({ a: literal('a2'), c: literal('c2')}),
            ]),
            metadata: () => Promise.resolve({}),
            type: 'bindings',
            variables: ['a', 'c'],
          },
          {
            bindingsStream: new ArrayIterator([
              Bindings({ a: literal('a1'), b: literal('b1')}),
              Bindings({ a: literal('a2'), b: literal('b2')}),
            ]),
            metadata: () => Promise.resolve({ totalItems: 2 }),
            type: 'bindings',
            variables: ['a', 'b'],
          },
        ],
      };
    });

    it('should test on 0 streams', () => {
      return expect(actor.test({ entries: [] })).resolves.toEqual({ iterations: 0 });
    });

    it('should test on 1 stream', () => {
      return expect(actor.test({ entries: [null] })).resolves.toEqual({ iterations: 0 });
    });

    it('should not test on 2 streams', () => {
      return expect(actor.test({ entries: [null, null] })).rejects
        .toThrow(new Error('actor requires 3 sources at least. The input contained 2.'));
    });

    it('should test on 3 streams', () => {
      return expect(actor.test(action3)).resolves.toEqual({ iterations: 40 });
    });

    it('should test on 4 streams', () => {
      return expect(actor.test(action4)).resolves.toEqual({ iterations: 80 });
    });

    it('should run on 3 streams', async () => {
      const output = await actor.run(action3);
      expect(output.type).toEqual('bindings');
      expect(output.variables).toEqual(['a', 'c', 'b']);
      expect(await output.metadata()).toEqual({ totalItems: 40 });
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ a: literal('a1'), b: literal('b1'), c: literal('c1')}),
        Bindings({ a: literal('a2'), b: literal('b2'), c: literal('c2')}),
      ]);

      // Check join order
      expect((<any> action3.entries[0]).called).toBe(0);
      expect((<any> action3.entries[1]).called).toBe(1);
      expect((<any> action3.entries[2]).called).toBe(0);
    });

    it('should run on 4 streams', async () => {
      const output = await actor.run(action4);
      expect(output.type).toEqual('bindings');
      expect(output.variables).toEqual(['a', 'c', 'd', 'b']);
      expect(await output.metadata()).toEqual({ totalItems: 80 });
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ a: literal('a1'), b: literal('b1'), c: literal('c1'), d: literal('d1')}),
        Bindings({ a: literal('a2'), b: literal('b2'), c: literal('c2'), d: literal('d2')}),
      ]);

      // Check join order
      expect((<any> action4.entries[0]).called).toBe(1);
      expect((<any> action4.entries[1]).called).toBe(2);
      expect((<any> action4.entries[2]).called).toBe(0);
      expect((<any> action4.entries[3]).called).toBe(0);
    });

    it('should run on 3 streams with one not having any totalItems metadata value', async () => {
      const output = await actor.run(action3PartialMeta);
      expect(output.type).toEqual('bindings');
      expect(output.variables).toEqual(['a', 'c', 'b']);
      expect(output.metadata).toBeFalsy();
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ a: literal('a1'), b: literal('b1'), c: literal('c1')}),
        Bindings({ a: literal('a2'), b: literal('b2'), c: literal('c2')}),
      ]);

      // Check join order
      expect((<any> action3PartialMeta.entries[0]).called).toBe(0);
      expect((<any> action3PartialMeta.entries[1]).called).toBe(1);
      expect((<any> action3PartialMeta.entries[2]).called).toBe(0);
    });
  });
});
