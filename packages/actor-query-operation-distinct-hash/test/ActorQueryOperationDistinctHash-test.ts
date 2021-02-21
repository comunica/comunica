import { Bindings } from '@comunica/bus-query-operation';
import { Bus } from '@comunica/core';
import type { IActorQueryOperationOutputBindings } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationDistinctHash } from '..';
const arrayifyStream = require('arrayify-stream');
const DF = new DataFactory();

describe('ActorQueryOperationDistinctHash', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ a: DF.literal('1') }),
          Bindings({ a: DF.literal('2') }),
          Bindings({ a: DF.literal('1') }),
          Bindings({ a: DF.literal('3') }),
          Bindings({ a: DF.literal('2') }),
        ]),
        metadata: () => Promise.resolve({ totalItems: 5 }),
        operated: arg,
        type: 'bindings',
        variables: [ 'a' ],
      }),
    };
  });

  describe('#newDistinctHashFilter', () => {
    let actor: ActorQueryOperationDistinctHash;

    beforeEach(() => {
      actor = new ActorQueryOperationDistinctHash(
        { name: 'actor', bus, mediatorQueryOperation },
      );
    });
    it('should create a filter', () => {
      return expect(actor.newHashFilter())
        .toBeInstanceOf(Function);
    });

    it('should create a filter that is a predicate', () => {
      const filter = actor.newHashFilter();
      return expect(filter(Bindings({ a: DF.literal('a') }))).toBe(true);
    });

    it('should create a filter that only returns true once for equal objects', () => {
      const filter = actor.newHashFilter();
      expect(filter(Bindings({ a: DF.literal('a') }))).toBe(true);
      expect(filter(Bindings({ a: DF.literal('a') }))).toBe(false);
      expect(filter(Bindings({ a: DF.literal('a') }))).toBe(false);
      expect(filter(Bindings({ a: DF.literal('a') }))).toBe(false);

      expect(filter(Bindings({ a: DF.literal('b') }))).toBe(true);
      expect(filter(Bindings({ a: DF.literal('b') }))).toBe(false);
      expect(filter(Bindings({ a: DF.literal('b') }))).toBe(false);
      expect(filter(Bindings({ a: DF.literal('b') }))).toBe(false);
    });

    it('should create a filters that are independent', () => {
      const filter1 = actor.newHashFilter();
      const filter2 = actor.newHashFilter();
      const filter3 = actor.newHashFilter();
      expect(filter1(Bindings({ a: DF.literal('b') }))).toBe(true);
      expect(filter1(Bindings({ a: DF.literal('b') }))).toBe(false);

      expect(filter2(Bindings({ a: DF.literal('b') }))).toBe(true);
      expect(filter2(Bindings({ a: DF.literal('b') }))).toBe(false);

      expect(filter3(Bindings({ a: DF.literal('b') }))).toBe(true);
      expect(filter3(Bindings({ a: DF.literal('b') }))).toBe(false);
    });
  });

  describe('An ActorQueryOperationDistinctHash instance', () => {
    let actor: ActorQueryOperationDistinctHash;
    beforeEach(() => {
      actor = new ActorQueryOperationDistinctHash(
        { name: 'actor', bus, mediatorQueryOperation },
      );
    });

    it('should test on distinct', () => {
      const op = { operation: { type: 'distinct' }};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-distinct', () => {
      const op = { operation: { type: 'some-other-type' }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', () => {
      const op = { operation: { type: 'distinct' }};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await (<any> output).metadata()).toEqual({ totalItems: 5 });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: DF.literal('1') }),
          Bindings({ a: DF.literal('2') }),
          Bindings({ a: DF.literal('3') }),
        ]);
      });
    });
  });
});
