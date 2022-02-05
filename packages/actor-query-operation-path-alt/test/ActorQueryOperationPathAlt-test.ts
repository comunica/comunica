import { BindingsFactory } from '@comunica/bindings-factory';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { Bus } from '@comunica/core';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Algebra, Factory } from 'sparqlalgebrajs';
import { ActorQueryOperationPathAlt } from '../lib/ActorQueryOperationPathAlt';
import '@comunica/jest';

const DF = new DataFactory();
const BF = new BindingsFactory();

describe('ActorQueryOperationPathAlt', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  const factory: Factory = new Factory();

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([[ DF.variable('x'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('x'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('x'), DF.literal('3') ]]),
        ]),
        metadata: () => Promise.resolve({ cardinality: { type: 'estimate', value: 3 }, canContainUndefs: false }),
        operated: arg,
        type: 'bindings',
        variables: [ DF.variable('a') ],
      }),
    };
  });

  describe('ActorQueryOperationPathAlt#unionMetadata', () => {
    it('should return 0 items for an empty input', () => {
      return expect(ActorQueryOperationPathAlt.unionMetadata([]))
        .toEqual({ cardinality: { type: 'exact', value: 0 }, canContainUndefs: false });
    });

    it('should return 1 items for a single input with 1', () => {
      return expect(ActorQueryOperationPathAlt.unionMetadata([
        { cardinality: { type: 'estimate', value: 1 }, canContainUndefs: false },
      ])).toEqual({ cardinality: { type: 'estimate', value: 1 }, canContainUndefs: false });
    });

    it('should return 0 items for a single input with 0', () => {
      return expect(ActorQueryOperationPathAlt.unionMetadata([
        { cardinality: { type: 'estimate', value: 0 }, canContainUndefs: false },
      ])).toEqual({ cardinality: { type: 'estimate', value: 0 }, canContainUndefs: false });
    });

    it('should return infinite items for a single input with Infinity', () => {
      return expect(ActorQueryOperationPathAlt.unionMetadata([
        { cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }, canContainUndefs: false },
      ]))
        .toEqual({ cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }, canContainUndefs: false });
    });

    it('should return 3 items for inputs with 1 and 2 as estimate', () => {
      return expect(ActorQueryOperationPathAlt.unionMetadata([
        { cardinality: { type: 'estimate', value: 1 }, canContainUndefs: false },
        { cardinality: { type: 'estimate', value: 2 }, canContainUndefs: false },
      ]))
        .toEqual({ cardinality: { type: 'estimate', value: 3 }, canContainUndefs: false });
    });

    it('should return 3 items for inputs with 1 and 2 as exact', () => {
      return expect(ActorQueryOperationPathAlt.unionMetadata([
        { cardinality: { type: 'exact', value: 1 }, canContainUndefs: false },
        { cardinality: { type: 'exact', value: 2 }, canContainUndefs: false },
      ]))
        .toEqual({ cardinality: { type: 'exact', value: 3 }, canContainUndefs: false });
    });
    it('should return 3 items for inputs with 1 and 2 as exact and estimate', () => {
      return expect(ActorQueryOperationPathAlt.unionMetadata([
        { cardinality: { type: 'estimate', value: 1 }, canContainUndefs: false },
        { cardinality: { type: 'exact', value: 2 }, canContainUndefs: false },
      ]))
        .toEqual({ cardinality: { type: 'estimate', value: 3 }, canContainUndefs: false });
    });

    it('should return infinite items for inputs with Infinity and 2', () => {
      return expect(ActorQueryOperationPathAlt
        .unionMetadata([
          { cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }, canContainUndefs: false },
          { cardinality: { type: 'estimate', value: 2 }, canContainUndefs: false },
        ]))
        .toEqual({ cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }, canContainUndefs: false });
    });

    it('should return infinite items for inputs with 1 and Infinity', () => {
      return expect(ActorQueryOperationPathAlt
        .unionMetadata([
          { cardinality: { type: 'estimate', value: 1 }, canContainUndefs: false },
          { cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }, canContainUndefs: false },
        ]))
        .toEqual({ cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }, canContainUndefs: false });
    });

    it('should return infinite items for inputs with Infinity and Infinity', () => {
      return expect(ActorQueryOperationPathAlt
        .unionMetadata([
          { cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }, canContainUndefs: false },
          { cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }, canContainUndefs: false },
        ]))
        .toEqual({ cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }, canContainUndefs: false });
    });

    it('should return canContainUndefs true if one is true', () => {
      return expect(ActorQueryOperationPathAlt
        .unionMetadata([
          { cardinality: { type: 'estimate', value: 10 }, canContainUndefs: false },
          { cardinality: { type: 'estimate', value: 20 }, canContainUndefs: true },
        ]))
        .toEqual({ cardinality: { type: 'estimate', value: 30 }, canContainUndefs: true });
    });
  });

  describe('The ActorQueryOperationPathAlt module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationPathAlt).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationPathAlt constructor', () => {
      expect(new (<any> ActorQueryOperationPathAlt)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationPathAlt);
      expect(new (<any> ActorQueryOperationPathAlt)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationPathAlt objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationPathAlt)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationPathAlt instance', () => {
    let actor: ActorQueryOperationPathAlt;

    beforeEach(() => {
      actor = new ActorQueryOperationPathAlt({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on Alt paths', () => {
      const op: any = { operation: { type: Algebra.types.PATH, predicate: { type: Algebra.types.ALT }}};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should test on different paths', () => {
      const op: any = { operation: { type: Algebra.types.PATH, predicate: { type: 'dummy' }}};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should not test on non-leftjoin', () => {
      const op: any = { operation: { type: 'some-other-type' }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should support Alt paths', async() => {
      const op: any = { operation: factory.createPath(
        DF.namedNode('s'),
        factory.createAlt([
          factory.createLink(DF.namedNode('p1')),
          factory.createLink(DF.namedNode('p2')),
        ]),
        DF.variable('x'),
      ) };
      const output = ActorQueryOperation.getSafeBindings(await actor.run(op));
      expect(await output.metadata())
        .toEqual({ cardinality: { type: 'estimate', value: 6 }, canContainUndefs: false });
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('x'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('3') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('3') ]]),
      ]);
    });
  });
});
