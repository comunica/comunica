import { BindingsFactory } from '@comunica/bindings-factory';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import type { IJoinEntry } from '@comunica/bus-rdf-join';
import { Bus } from '@comunica/core';
import type { IQueryableResultBindings } from '@comunica/types';
import { ArrayIterator, UnionIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationMinus } from '../lib/ActorQueryOperationMinus';
const arrayifyStream = require('arrayify-stream');

const DF = new DataFactory();
const BF = new BindingsFactory();

describe('ActorQueryOperationMinus', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let mediatorJoin: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings({ a: DF.literal('1') }),
          BF.bindings({ a: DF.literal('2') }),
          BF.bindings({ a: DF.literal('3') }),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false }),
        operated: arg,
        type: 'bindings',
        variables: [ 'a' ],
      }),
    };
    mediatorJoin = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new UnionIterator(arg.entries.map((entry: IJoinEntry) => entry.output.bindingsStream)),
        metadata: () => Promise.resolve({ cardinality: 100, canContainUndefs: false }),
        operated: arg,
        type: 'bindings',
        variables: [ 'a', 'b' ],
      }),
    };
  });

  describe('The ActorQueryOperationMinus module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationMinus).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationMinus constructor', () => {
      expect(new (<any> ActorQueryOperationMinus)({ name: 'actor', bus, mediatorQueryOperation, mediatorJoin }))
        .toBeInstanceOf(ActorQueryOperationMinus);
      expect(new (<any> ActorQueryOperationMinus)({ name: 'actor', bus, mediatorQueryOperation, mediatorJoin }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationMinus objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationMinus)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationMinus instance', () => {
    let actor: ActorQueryOperationMinus;

    beforeEach(() => {
      actor = new ActorQueryOperationMinus({ name: 'actor', bus, mediatorQueryOperation, mediatorJoin });
    });

    it('should test on minus', () => {
      const op: any = { operation: { type: 'minus' }};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-minus', () => {
      const op: any = { operation: { type: 'some-other-type' }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', () => {
      const op: any = { operation: { type: 'minus', input: [{}, {}, {}]}};
      return actor.run(op).then(async(output: IQueryableResultBindings) => {
        expect(output.variables).toEqual([ 'a', 'b' ]);
        expect(output.type).toEqual('bindings');
        expect(await output.metadata()).toEqual({ cardinality: 100, canContainUndefs: false });
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          BF.bindings({ a: DF.literal('1') }),
          BF.bindings({ a: DF.literal('1') }),
          BF.bindings({ a: DF.literal('1') }),
          BF.bindings({ a: DF.literal('2') }),
          BF.bindings({ a: DF.literal('2') }),
          BF.bindings({ a: DF.literal('2') }),
          BF.bindings({ a: DF.literal('3') }),
          BF.bindings({ a: DF.literal('3') }),
          BF.bindings({ a: DF.literal('3') }),
        ]);
      });
    });
  });
});
