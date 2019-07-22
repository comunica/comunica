import {Bindings, IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {literal} from "@rdfjs/data-model";
import {ArrayIterator} from "asynciterator";
import {ActorQueryOperationReducedHash} from "..";
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationReducedHash', () => {
  let bus;
  let mediatorQueryOperation;
  let hashAlgorithm;
  let digestAlgorithm;
  let cacheSize;

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
    cacheSize = 20;
  });

  describe('#newReducedHashFilter', () => {
    let actor: ActorQueryOperationReducedHash;

    beforeEach(() => {
      actor = new ActorQueryOperationReducedHash(
            { name: 'actor', bus, mediatorQueryOperation, hashAlgorithm, digestAlgorithm, cacheSize });
    });
    it('should create a filter', () => {
      return expect(actor.newHashFilter('sha1', 'base64'))
                .toBeInstanceOf(Function);
    });

    it('should create a filter that is a predicate', () => {
      const filter = actor.newHashFilter('sha1', 'base64');
      return expect(filter(Bindings({ a: literal('a') }))).toBe(true);
    });

    it('should create a filter that only returns true once for equal objects', () => {
      const filter = actor.newHashFilter('sha1', 'base64');
      expect(filter(Bindings({ a: literal('a') }))).toBe(true);
      expect(filter(Bindings({ a: literal('a') }))).toBe(false);
      expect(filter(Bindings({ a: literal('a') }))).toBe(false);
      expect(filter(Bindings({ a: literal('a') }))).toBe(false);

      expect(filter(Bindings({ a: literal('b') }))).toBe(true);
      expect(filter(Bindings({ a: literal('b') }))).toBe(false);
      expect(filter(Bindings({ a: literal('b') }))).toBe(false);
      expect(filter(Bindings({ a: literal('b') }))).toBe(false);
    });

    it('should create a filters that are independent', () => {
      const filter1 = actor.newHashFilter('sha1', 'base64');
      const filter2 = actor.newHashFilter('sha1', 'base64');
      const filter3 = actor.newHashFilter('sha1', 'base64');
      expect(filter1(Bindings({ a: literal('b') }))).toBe(true);
      expect(filter1(Bindings({ a: literal('b') }))).toBe(false);

      expect(filter2(Bindings({ a: literal('b') }))).toBe(true);
      expect(filter2(Bindings({ a: literal('b') }))).toBe(false);

      expect(filter3(Bindings({ a: literal('b') }))).toBe(true);
      expect(filter3(Bindings({ a: literal('b') }))).toBe(false);
    });
  });

  describe('An ActorQueryOperationReducedHash instance', () => {
    let actor: ActorQueryOperationReducedHash;

    beforeEach(() => {
      actor = new ActorQueryOperationReducedHash(
                { name: 'actor', bus, mediatorQueryOperation, hashAlgorithm, digestAlgorithm, cacheSize });
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
  let cacheSize;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    hashAlgorithm = 'sha1';
    digestAlgorithm = 'base64';
    cacheSize = 1;
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
          { name: 'actor', bus, mediatorQueryOperation, hashAlgorithm, digestAlgorithm, cacheSize });

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
