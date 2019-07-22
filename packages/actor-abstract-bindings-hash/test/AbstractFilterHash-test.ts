import { Bindings, IActorQueryOperationTypedMediatedArgs } from "@comunica/bus-query-operation";
import {Actor, Bus} from "@comunica/core";
import {literal, namedNode} from "@rdfjs/data-model";
import {ArrayIterator} from "asynciterator";
import {AbstractFilterHash} from "..";

describe('AbstractFilterHash', () => {
  let bus;
  let mediatorQueryOperation;
  let hashAlgorithm: string;
  let digestAlgorithm: string;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: IActorQueryOperationTypedMediatedArgs) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ a: literal('1') }),
          Bindings({ a: literal('2') }),
          Bindings({ a: literal('1') }),
          Bindings({ a: literal('3') }),
          Bindings({ a: literal('2') }),
        ]),
        metadata: () => Promise.resolve({ totalItems: 5 }),
        operated: arg,
        type: 'bindings',
        variables: ['a'],
      }),
    };
    hashAlgorithm = 'sha1';
    digestAlgorithm = 'base64';
  });

  describe('The AbstractFilterHash module', () => {
    it('should be a function', () => {
      expect(AbstractFilterHash).toBeInstanceOf(Function);
    });

    it('should be a AbstractFilterHash constructor', () => {
      expect(new (<any> AbstractFilterHash)
      ({ bus: new Bus({ name: 'bus' }), name: 'actor', hashAlgorithm, digestAlgorithm}, 'distinct'))
              .toBeInstanceOf(AbstractFilterHash);
      expect(new (<any> AbstractFilterHash)
        ({ bus: new Bus({ name: 'bus' }), name: 'actor', hashAlgorithm, digestAlgorithm}, 'distinct'))
              .toBeInstanceOf(Actor);
    });
    it('should not be able to create new AbstractFilterHash objects without \'new\'', () => {
      expect(() => { (<any> AbstractFilterHash)(); }).toThrow();
    });

    it('should not be able to create new AbstractFilterHash objects with an invalid hash algo', () => {
      expect(() => { new (<any> AbstractFilterHash) (
          { name: 'actor', bus, mediatorQueryOperation, hashAlgorithm: 'abc', digestAlgorithm }, 'distinct'); })
          .toThrow();
    });

    it('should not be able to create new AbstractFilterHash objects with an invalid digest algo', () => {
      expect(() => { new (<any> AbstractFilterHash) (
          { name: 'actor', bus, mediatorQueryOperation, hashAlgorithm, digestAlgorithm: 'abc' }, 'distinct'); })
          .toThrow();
    });
  });

  describe('#doesHashAlgorithmExist', () => {
    it('should be true on sha1', () => {
      return expect(AbstractFilterHash.doesHashAlgorithmExist('sha1')).toBeTruthy();
    });

    it('should be true on md5', () => {
      return expect(AbstractFilterHash.doesHashAlgorithmExist('md5')).toBeTruthy();
    });

    it('should not be true on something that does not exist', () => {
      return expect(AbstractFilterHash.doesHashAlgorithmExist('somethingthatdoesnotexist'))
                .toBeFalsy();
    });
  });

  describe('#doesDigestAlgorithmExist', () => {
    it('should be true on latin1', () => {
      return expect(AbstractFilterHash.doesDigestAlgorithmExist('latin1')).toBeTruthy();
    });

    it('should be true on hex', () => {
      return expect(AbstractFilterHash.doesDigestAlgorithmExist('hex')).toBeTruthy();
    });

    it('should be true on base64', () => {
      return expect(AbstractFilterHash.doesDigestAlgorithmExist('base64')).toBeTruthy();
    });

    it('should not be true on something that does not exist', () => {
      return expect(AbstractFilterHash.doesDigestAlgorithmExist('somethingthatdoesnotexist'))
                .toBeFalsy();
    });
  });

  describe('#hash', () => {
    it('should return the same hash for equal objects', () => {
      expect(AbstractFilterHash.hash('sha1', 'base64', Bindings({ a: literal('b') })))
        .toEqual(AbstractFilterHash.hash('sha1', 'base64', Bindings({ a: literal('b') })));
      expect(AbstractFilterHash.hash('sha1', 'base64', Bindings({ a: namedNode('c') })))
        .toEqual(AbstractFilterHash.hash('sha1', 'base64', Bindings({ a: namedNode('c') })));
    });

    it('should return a different hash for non-equal objects', () => {
      expect(AbstractFilterHash.hash('sha1', 'base64', Bindings({ a: literal('b') })))
        .not.toEqual(AbstractFilterHash.hash('sha1', 'base64', Bindings({ a: literal('c') })));
      expect(AbstractFilterHash.hash('sha1', 'base64', Bindings({ a: literal('b') })))
        .not.toEqual(AbstractFilterHash.hash('sha1', 'base64', Bindings({ a: namedNode('b') })));
    });
  });
});
