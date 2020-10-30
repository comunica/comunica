import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { Bindings } from '@comunica/bus-query-operation';
import { Actor, Bus } from '@comunica/core';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { AbstractFilterHash } from '..';

const DF = new DataFactory();

describe('AbstractFilterHash', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let hashAlgorithm: string;
  let digestAlgorithm: string;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: IActorQueryOperationTypedMediatedArgs) => Promise.resolve({
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

  describe('The AbstractFilterHash module', () => {
    it('should be a function', () => {
      expect(AbstractFilterHash).toBeInstanceOf(Function);
    });

    it('should be a AbstractFilterHash constructor', () => {
      // eslint-disable-next-line @typescript-eslint/func-call-spacing
      expect(new (<any> AbstractFilterHash)
      ({ bus: new Bus({ name: 'bus' }), name: 'actor' }, 'distinct'))
        .toBeInstanceOf(AbstractFilterHash);
      // eslint-disable-next-line @typescript-eslint/func-call-spacing
      expect(new (<any> AbstractFilterHash)
      ({ bus: new Bus({ name: 'bus' }), name: 'actor' }, 'distinct'))
        .toBeInstanceOf(Actor);
    });
    it('should not be able to create new AbstractFilterHash objects without \'new\'', () => {
      expect(() => { (<any> AbstractFilterHash)(); }).toThrow();
    });
  });

  describe('#hash', () => {
    it('should return the same hash for equal objects', () => {
      expect(AbstractFilterHash.hash(Bindings({ a: DF.literal('b') })))
        .toEqual(AbstractFilterHash.hash(Bindings({ a: DF.literal('b') })));
      expect(AbstractFilterHash.hash(Bindings({ a: DF.namedNode('c') })))
        .toEqual(AbstractFilterHash.hash(Bindings({ a: DF.namedNode('c') })));
    });

    it('should return a different hash for non-equal objects', () => {
      expect(AbstractFilterHash.hash(Bindings({ a: DF.literal('b') })))
        .not.toEqual(AbstractFilterHash.hash(Bindings({ a: DF.literal('c') })));
      expect(AbstractFilterHash.hash(Bindings({ a: DF.literal('b') })))
        .not.toEqual(AbstractFilterHash.hash(Bindings({ a: DF.namedNode('b') })));
    });
  });
});
