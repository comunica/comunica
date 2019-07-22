import {Bindings, IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {literal} from "@rdfjs/data-model";
import {ArrayIterator} from "asynciterator";
import {ActorQueryOperationDistinctHash} from "..";
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

  describe('#newDistinctHashFilter', () => {
    let actor: ActorQueryOperationDistinctHash;

    beforeEach(() => {
      actor = new ActorQueryOperationDistinctHash(
            { name: 'actor', bus, mediatorQueryOperation, hashAlgorithm, digestAlgorithm });
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
