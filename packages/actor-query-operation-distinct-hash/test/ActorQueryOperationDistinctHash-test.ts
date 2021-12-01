import { BindingsFactory } from '@comunica/bindings-factory';
import { Bus } from '@comunica/core';
import type { IQueryableResultBindings } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationDistinctHash } from '..';
const arrayifyStream = require('arrayify-stream');

const DF = new DataFactory();
const BF = new BindingsFactory();

describe('ActorQueryOperationDistinctHash', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings({ a: DF.literal('1') }),
          BF.bindings({ a: DF.literal('2') }),
          BF.bindings({ a: DF.literal('1') }),
          BF.bindings({ a: DF.literal('3') }),
          BF.bindings({ a: DF.literal('2') }),
        ]),
        metadata: () => Promise.resolve({ cardinality: 5 }),
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
      return expect(filter(BF.bindings({ a: DF.literal('a') }))).toBe(true);
    });

    it('should create a filter that only returns true once for equal objects', () => {
      const filter = actor.newHashFilter();
      expect(filter(BF.bindings({ a: DF.literal('a') }))).toBe(true);
      expect(filter(BF.bindings({ a: DF.literal('a') }))).toBe(false);
      expect(filter(BF.bindings({ a: DF.literal('a') }))).toBe(false);
      expect(filter(BF.bindings({ a: DF.literal('a') }))).toBe(false);

      expect(filter(BF.bindings({ a: DF.literal('b') }))).toBe(true);
      expect(filter(BF.bindings({ a: DF.literal('b') }))).toBe(false);
      expect(filter(BF.bindings({ a: DF.literal('b') }))).toBe(false);
      expect(filter(BF.bindings({ a: DF.literal('b') }))).toBe(false);
    });

    it('should create a filters that are independent', () => {
      const filter1 = actor.newHashFilter();
      const filter2 = actor.newHashFilter();
      const filter3 = actor.newHashFilter();
      expect(filter1(BF.bindings({ a: DF.literal('b') }))).toBe(true);
      expect(filter1(BF.bindings({ a: DF.literal('b') }))).toBe(false);

      expect(filter2(BF.bindings({ a: DF.literal('b') }))).toBe(true);
      expect(filter2(BF.bindings({ a: DF.literal('b') }))).toBe(false);

      expect(filter3(BF.bindings({ a: DF.literal('b') }))).toBe(true);
      expect(filter3(BF.bindings({ a: DF.literal('b') }))).toBe(false);
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
      const op: any = { operation: { type: 'distinct' }};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-distinct', () => {
      const op: any = { operation: { type: 'some-other-type' }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', () => {
      const op: any = { operation: { type: 'distinct' }};
      return actor.run(op).then(async(output: IQueryableResultBindings) => {
        expect(await (<any> output).metadata()).toEqual({ cardinality: 5 });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          BF.bindings({ a: DF.literal('1') }),
          BF.bindings({ a: DF.literal('2') }),
          BF.bindings({ a: DF.literal('3') }),
        ]);
      });
    });
  });
});
