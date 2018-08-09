import {ActorQueryOperation, Bindings, IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {literal} from "@rdfjs/data-model";
import {ArrayIterator} from "asynciterator";
import {ActorQueryOperationDistinctHash} from "../lib/ActorQueryOperationDistinctHash";
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationDistinctHash', () => {
  let bus;
  let mediatorQueryOperation;
  let hashAlgorithm;
  let digestAlgorithm;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg) => Promise.resolve({
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

  describe('The ActorQueryOperationDistinctHash module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationDistinctHash).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationDistinctHash constructor', () => {
      expect(new (<any> ActorQueryOperationDistinctHash)(
        { name: 'actor', bus, mediatorQueryOperation, hashAlgorithm, digestAlgorithm }))
        .toBeInstanceOf(ActorQueryOperationDistinctHash);
      expect(new (<any> ActorQueryOperationDistinctHash)(
        { name: 'actor', bus, mediatorQueryOperation, hashAlgorithm, digestAlgorithm }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationDistinctHash objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationDistinctHash)(); }).toThrow();
    });

    it('should not be able to create new ActorQueryOperationDistinctHash objects with an invalid hash algo', () => {
      expect(() => { new ActorQueryOperationDistinctHash(
        { name: 'actor', bus, mediatorQueryOperation, hashAlgorithm: 'abc', digestAlgorithm }); }).toThrow();
    });

    it('should not be able to create new ActorQueryOperationDistinctHash objects with an invalid digest algo', () => {
      expect(() => { new ActorQueryOperationDistinctHash(
        { name: 'actor', bus, mediatorQueryOperation, hashAlgorithm, digestAlgorithm: 'abc' }); }).toThrow();
    });
  });

  describe('#doesHashAlgorithmExist', () => {
    it('should be true on sha1', () => {
      return expect(ActorQueryOperationDistinctHash.doesHashAlgorithmExist('sha1')).toBeTruthy();
    });

    it('should be true on md5', () => {
      return expect(ActorQueryOperationDistinctHash.doesHashAlgorithmExist('md5')).toBeTruthy();
    });

    it('should not be true on something that does not exist', () => {
      return expect(ActorQueryOperationDistinctHash.doesHashAlgorithmExist('somethingthatdoesnotexist'))
        .toBeFalsy();
    });
  });

  describe('#doesDigestAlgorithmExist', () => {
    it('should be true on latin1', () => {
      return expect(ActorQueryOperationDistinctHash.doesDigestAlgorithmExist('latin1')).toBeTruthy();
    });

    it('should be true on hex', () => {
      return expect(ActorQueryOperationDistinctHash.doesDigestAlgorithmExist('hex')).toBeTruthy();
    });

    it('should be true on base64', () => {
      return expect(ActorQueryOperationDistinctHash.doesDigestAlgorithmExist('base64')).toBeTruthy();
    });

    it('should not be true on something that does not exist', () => {
      return expect(ActorQueryOperationDistinctHash.doesDigestAlgorithmExist('somethingthatdoesnotexist'))
        .toBeFalsy();
    });
  });

  describe('#hash', () => {
    it('should return the same hash for equal objects', () => {
      expect(ActorQueryOperationDistinctHash.hash('sha1', 'base64', { a: 'b' }))
        .toEqual(ActorQueryOperationDistinctHash.hash('sha1', 'base64', { a: 'b' }));
      expect(ActorQueryOperationDistinctHash.hash('sha1', 'base64', { a: 'c' }))
        .toEqual(ActorQueryOperationDistinctHash.hash('sha1', 'base64', { a: 'c' }));
      expect(ActorQueryOperationDistinctHash.hash('sha1', 'base64', 123))
        .toEqual(ActorQueryOperationDistinctHash.hash('sha1', 'base64', 123));
      expect(ActorQueryOperationDistinctHash.hash('sha1', 'base64', 'abcdefg'))
        .toEqual(ActorQueryOperationDistinctHash.hash('sha1', 'base64', 'abcdefg'));
    });

    it('should return a different hash for non-equal objects', () => {
      expect(ActorQueryOperationDistinctHash.hash('sha1', 'base64', { a: 'c' })).not
        .toEqual(ActorQueryOperationDistinctHash.hash('sha1', 'base64', { a: 'b' }));
      expect(ActorQueryOperationDistinctHash.hash('sha1', 'base64', { a: 'b' })).not
        .toEqual(ActorQueryOperationDistinctHash.hash('sha1', 'base64', { a: 'c' }));
      expect(ActorQueryOperationDistinctHash.hash('sha1', 'base64', 124)).not
        .toEqual(ActorQueryOperationDistinctHash.hash('sha1', 'base64', 123));
      expect(ActorQueryOperationDistinctHash.hash('sha1', 'base64', 'abcdefz')).not
        .toEqual(ActorQueryOperationDistinctHash.hash('sha1', 'base64', 'abcdefg'));
    });
  });

  describe('#newDistinctHashFilter', () => {
    it('should create a filter', () => {
      return expect(ActorQueryOperationDistinctHash.newDistinctHashFilter('sha1', 'base64'))
        .toBeInstanceOf(Function);
    });

    it('should create a filter that is a predicate', () => {
      const filter = ActorQueryOperationDistinctHash.newDistinctHashFilter('sha1', 'base64');
      return expect(filter(<any> 'abc')).toBe(true);
    });

    it('should create a filter that only returns true once for equal objects', () => {
      const filter = ActorQueryOperationDistinctHash.newDistinctHashFilter('sha1', 'base64');
      expect(filter(<any> 'abc')).toBe(true);
      expect(filter(<any> 'abc')).toBe(false);
      expect(filter(<any> 'abc')).toBe(false);
      expect(filter(<any> 'abc')).toBe(false);

      expect(filter(<any> { a: 'c' })).toBe(true);
      expect(filter(<any> { a: 'c' })).toBe(false);
      expect(filter(<any> { a: 'c' })).toBe(false);
      expect(filter(<any> { a: 'c' })).toBe(false);
    });

    it('should create a filters that are independent', () => {
      const filter1 = ActorQueryOperationDistinctHash.newDistinctHashFilter('sha1', 'base64');
      const filter2 = ActorQueryOperationDistinctHash.newDistinctHashFilter('sha1', 'base64');
      const filter3 = ActorQueryOperationDistinctHash.newDistinctHashFilter('sha1', 'base64');
      expect(filter1(<any> 'abc')).toBe(true);
      expect(filter1(<any> 'abc')).toBe(false);

      expect(filter2(<any> 'abc')).toBe(true);
      expect(filter2(<any> 'abc')).toBe(false);

      expect(filter3(<any> 'abc')).toBe(true);
      expect(filter3(<any> 'abc')).toBe(false);
    });
  });

  describe('An ActorQueryOperationDistinctHash instance', () => {
    let actor: ActorQueryOperationDistinctHash;

    beforeEach(() => {
      actor = new ActorQueryOperationDistinctHash(
        { name: 'actor', bus, mediatorQueryOperation, hashAlgorithm, digestAlgorithm });
    });

    it('should test on distinct', () => {
      const op = { operation: { type: 'distinct' } };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-distinct', () => {
      const op = { operation: { type: 'some-other-type' } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', () => {
      const op = { operation: { type: 'distinct' } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ totalItems: 5 });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: literal('1') }),
          Bindings({ a: literal('2') }),
          Bindings({ a: literal('3') }),
        ]);
      });
    });
  });
});
