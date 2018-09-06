import {ActorQueryOperation, Bindings, IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {literal} from "@rdfjs/data-model";
import {ArrayIterator} from "asynciterator";
import {ActorQueryOperationReducedHash} from "../lib/ActorQueryOperationReducedHash";
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationReducedHash', () => {
  let bus;
  let mediatorQueryOperation;
  let hashAlgorithm;
  let digestAlgorithm;
  let cachesize;

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
    cachesize = 20;
  });

  describe('The ActorQueryOperationReducedHash module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationReducedHash).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationReducedHash constructor', () => {
      expect(new (<any> ActorQueryOperationReducedHash)(
                { name: 'actor', bus, mediatorQueryOperation, hashAlgorithm, digestAlgorithm }))
                .toBeInstanceOf(ActorQueryOperationReducedHash);
      expect(new (<any> ActorQueryOperationReducedHash)(
                { name: 'actor', bus, mediatorQueryOperation, hashAlgorithm, digestAlgorithm }))
                .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationReducedHash objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationReducedHash)(); }).toThrow();
    });

    it('should not be able to create new ActorQueryOperationReducedHash objects with an invalid hash algo', () => {
      expect(() => { new ActorQueryOperationReducedHash(
                { name: 'actor', bus, mediatorQueryOperation, hashAlgorithm: 'abc', digestAlgorithm, cachesize }); })
          .toThrow();
    });

    it('should not be able to create new ActorQueryOperationReducedHash objects with an invalid digest algo', () => {
      expect(() => { new ActorQueryOperationReducedHash(
                { name: 'actor', bus, mediatorQueryOperation, hashAlgorithm, digestAlgorithm: 'abc', cachesize }); })
          .toThrow();
    });
  });

  describe('#doesHashAlgorithmExist', () => {
    it('should be true on sha1', () => {
      return expect(ActorQueryOperationReducedHash.doesHashAlgorithmExist('sha1')).toBeTruthy();
    });

    it('should be true on md5', () => {
      return expect(ActorQueryOperationReducedHash.doesHashAlgorithmExist('md5')).toBeTruthy();
    });

    it('should not be true on something that does not exist', () => {
      return expect(ActorQueryOperationReducedHash.doesHashAlgorithmExist('somethingthatdoesnotexist'))
                .toBeFalsy();
    });
  });

  describe('#doesDigestAlgorithmExist', () => {
    it('should be true on latin1', () => {
      return expect(ActorQueryOperationReducedHash.doesDigestAlgorithmExist('latin1')).toBeTruthy();
    });

    it('should be true on hex', () => {
      return expect(ActorQueryOperationReducedHash.doesDigestAlgorithmExist('hex')).toBeTruthy();
    });

    it('should be true on base64', () => {
      return expect(ActorQueryOperationReducedHash.doesDigestAlgorithmExist('base64')).toBeTruthy();
    });

    it('should not be true on something that does not exist', () => {
      return expect(ActorQueryOperationReducedHash.doesDigestAlgorithmExist('somethingthatdoesnotexist'))
                .toBeFalsy();
    });
  });

  describe('#hash', () => {
    it('should return the same hash for equal objects', () => {
      expect(ActorQueryOperationReducedHash.hash('sha1', 'base64', { a: 'b' }))
                .toEqual(ActorQueryOperationReducedHash.hash('sha1', 'base64', { a: 'b' }));
      expect(ActorQueryOperationReducedHash.hash('sha1', 'base64', { a: 'c' }))
                .toEqual(ActorQueryOperationReducedHash.hash('sha1', 'base64', { a: 'c' }));
      expect(ActorQueryOperationReducedHash.hash('sha1', 'base64', 123))
                .toEqual(ActorQueryOperationReducedHash.hash('sha1', 'base64', 123));
      expect(ActorQueryOperationReducedHash.hash('sha1', 'base64', 'abcdefg'))
                .toEqual(ActorQueryOperationReducedHash.hash('sha1', 'base64', 'abcdefg'));
    });

    it('should return a different hash for non-equal objects', () => {
      expect(ActorQueryOperationReducedHash.hash('sha1', 'base64', { a: 'c' })).not
                .toEqual(ActorQueryOperationReducedHash.hash('sha1', 'base64', { a: 'b' }));
      expect(ActorQueryOperationReducedHash.hash('sha1', 'base64', { a: 'b' })).not
                .toEqual(ActorQueryOperationReducedHash.hash('sha1', 'base64', { a: 'c' }));
      expect(ActorQueryOperationReducedHash.hash('sha1', 'base64', 124)).not
                .toEqual(ActorQueryOperationReducedHash.hash('sha1', 'base64', 123));
      expect(ActorQueryOperationReducedHash.hash('sha1', 'base64', 'abcdefz')).not
                .toEqual(ActorQueryOperationReducedHash.hash('sha1', 'base64', 'abcdefg'));
    });
  });

  describe('#newReducedHashFilter', () => {
    it('should create a filter', () => {
      return expect(ActorQueryOperationReducedHash.newReducedHashFilter('sha1', 'base64', cachesize))
                .toBeInstanceOf(Function);
    });

    it('should create a filter that is a predicate', () => {
      const filter = ActorQueryOperationReducedHash.newReducedHashFilter('sha1', 'base64', cachesize);
      return expect(filter(<any> 'abc')).toBe(true);
    });

    it('should create a filter that only returns true once for equal objects', () => {
      const filter = ActorQueryOperationReducedHash.newReducedHashFilter('sha1', 'base64', cachesize);
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
      const filter1 = ActorQueryOperationReducedHash.newReducedHashFilter('sha1', 'base64', cachesize);
      const filter2 = ActorQueryOperationReducedHash.newReducedHashFilter('sha1', 'base64', cachesize);
      const filter3 = ActorQueryOperationReducedHash.newReducedHashFilter('sha1', 'base64', cachesize);
      expect(filter1(<any> 'abc')).toBe(true);
      expect(filter1(<any> 'abc')).toBe(false);

      expect(filter2(<any> 'abc')).toBe(true);
      expect(filter2(<any> 'abc')).toBe(false);

      expect(filter3(<any> 'abc')).toBe(true);
      expect(filter3(<any> 'abc')).toBe(false);
    });
  });

  describe('An ActorQueryOperationReducedHash instance', () => {
    let actor: ActorQueryOperationReducedHash;

    beforeEach(() => {
      actor = new ActorQueryOperationReducedHash(
                { name: 'actor', bus, mediatorQueryOperation, hashAlgorithm, digestAlgorithm, cachesize });
    });

    it('should test on reduced', () => {
      const op = { operation: { type: 'reduced' } };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-reduced', () => {
      const op = { operation: { type: 'some-other-type' } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', () => {
      const op = { operation: { type: 'reduced' } };
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

describe('Smaller cache than number of queries', () => {
  let actor: ActorQueryOperationReducedHash;
  let bus;
  let mediatorQueryOperation;
  let hashAlgorithm;
  let digestAlgorithm;
  let cachesize;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    hashAlgorithm = 'sha1';
    digestAlgorithm = 'base64';
    cachesize = 1;
    mediatorQueryOperation = {
      mediate: (arg) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ a: literal('1') }),
          Bindings({ a: literal('1') }),
          Bindings({ a: literal('1') }),
          Bindings({ a: literal('3') }),
          Bindings({ a: literal('2') }),
          Bindings({ a: literal('2') }),
          Bindings({ a: literal('1') }),
        ]),
        metadata: () => Promise.resolve({ totalItems: 7 }),
        operated: arg,
        type: 'bindings',
        variables: ['a'],
      }),
    };
    actor = new ActorQueryOperationReducedHash(
          { name: 'actor', bus, mediatorQueryOperation, hashAlgorithm, digestAlgorithm, cachesize });

  });
  it('should run', () => {
    const op = { operation: { type: 'reduced' } };
    return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
      expect(await output.metadata()).toEqual({ totalItems: 7 });
      expect(output.variables).toEqual([ 'a' ]);
      expect(output.type).toEqual('bindings');
      expect(await arrayifyStream(output.bindingsStream)).toEqual([
        Bindings({ a: literal('1') }),
        Bindings({ a: literal('3') }),
        Bindings({ a: literal('2') }),
        Bindings({ a: literal('1') }),
      ]);
    });
  });
});
