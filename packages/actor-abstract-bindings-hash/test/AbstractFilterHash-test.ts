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
    hashAlgorithm = 'sha1';
    digestAlgorithm = 'hex';
  });

  describe('The AbstractFilterHash module', () => {
    it('should be a function', () => {
      expect(AbstractFilterHash).toBeInstanceOf(Function);
    });

    it('should be a AbstractFilterHash constructor', () => {
      // eslint-disable-next-line @typescript-eslint/func-call-spacing
      expect(new (<any> AbstractFilterHash)
      ({ bus: new Bus({ name: 'bus' }), name: 'actor', hashAlgorithm, digestAlgorithm }, 'distinct'))
        .toBeInstanceOf(AbstractFilterHash);
      // eslint-disable-next-line @typescript-eslint/func-call-spacing
      expect(new (<any> AbstractFilterHash)
      ({ bus: new Bus({ name: 'bus' }), name: 'actor', hashAlgorithm, digestAlgorithm }, 'distinct'))
        .toBeInstanceOf(Actor);
    });
    it('should not be able to create new AbstractFilterHash objects without \'new\'', () => {
      expect(() => { (<any> AbstractFilterHash)(); }).toThrow();
    });

    it('should not be able to create new AbstractFilterHash objects with an invalid hash algo', () => {
      expect(() => { new (<any> AbstractFilterHash)(
        { name: 'actor', bus, mediatorQueryOperation, hashAlgorithm: 'abc', digestAlgorithm }, 'distinct',
      ); })
        .toThrow();
    });

    it('should not be able to create new AbstractFilterHash objects with an invalid digest algo', () => {
      expect(() => { new (<any> AbstractFilterHash)(
        { name: 'actor', bus, mediatorQueryOperation, hashAlgorithm, digestAlgorithm: 'abc' }, 'distinct',
      ); })
        .toThrow();
    });
  });

  describe('#doesHashAlgorithmExist', () => {
    it('should be true on sha1', () => {
      return expect(AbstractFilterHash.doesHashAlgorithmExist('sha1')).toBeTruthy();
    });

    it('should be false on md5', () => {
      return expect(AbstractFilterHash.doesHashAlgorithmExist('md5')).toBeFalsy();
    });

    it('should not be true on something that does not exist', () => {
      return expect(AbstractFilterHash.doesHashAlgorithmExist('somethingthatdoesnotexist'))
        .toBeFalsy();
    });
  });

  describe('#doesDigestAlgorithmExist', () => {
    it('should be false on latin1', () => {
      return expect(AbstractFilterHash.doesDigestAlgorithmExist('latin1')).toBeFalsy();
    });

    it('should be true on hex', () => {
      return expect(AbstractFilterHash.doesDigestAlgorithmExist('hex')).toBeTruthy();
    });

    it('should be false on base64', () => {
      return expect(AbstractFilterHash.doesDigestAlgorithmExist('base64')).toBeFalsy();
    });

    it('should not be true on something that does not exist', () => {
      return expect(AbstractFilterHash.doesDigestAlgorithmExist('somethingthatdoesnotexist'))
        .toBeFalsy();
    });
  });

  describe('#hash', () => {
    it('should return the same hash for equal objects', () => {
      expect(AbstractFilterHash.hash('sha1', 'hex', Bindings({ a: DF.literal('b') })))
        .toEqual(AbstractFilterHash.hash('sha1', 'hex', Bindings({ a: DF.literal('b') })));
      expect(AbstractFilterHash.hash('sha1', 'hex', Bindings({ a: DF.namedNode('c') })))
        .toEqual(AbstractFilterHash.hash('sha1', 'hex', Bindings({ a: DF.namedNode('c') })));
    });

    it('should return a different hash for non-equal objects', () => {
      expect(AbstractFilterHash.hash('sha1', 'hex', Bindings({ a: DF.literal('b') })))
        .not.toEqual(AbstractFilterHash.hash('sha1', 'hex', Bindings({ a: DF.literal('c') })));
      expect(AbstractFilterHash.hash('sha1', 'hex', Bindings({ a: DF.literal('b') })))
        .not.toEqual(AbstractFilterHash.hash('sha1', 'hex', Bindings({ a: DF.namedNode('b') })));
    });
  });
});
