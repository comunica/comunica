import {
    Bindings,
    IActorQueryOperationOutputBindings,
    IActorQueryOperationTypedMediatedArgs,
} from "@comunica/bus-query-operation";
import {Actor, Bus} from "@comunica/core";
import {literal} from "@rdfjs/data-model";
import {ArrayIterator} from "asynciterator";
import {Algebra} from "sparqlalgebrajs";
import {AbstractBindingHash} from "../lib/AbstractBindingsHash";
const arrayifyStream = require('arrayify-stream');

describe('AbstractBindingHash', () => {
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

  describe('The AbstractBindingHash module', () => {
    it('should be a function', () => {
      expect(AbstractBindingHash).toBeInstanceOf(Function);
    });

    it('should be a AbstractBindingHash constructor', () => {
      expect(new (<any> AbstractBindingHash)
      ({ bus: new Bus({ name: 'bus' }), name: 'actor', hashAlgorithm, digestAlgorithm}, 'distinct'))
              .toBeInstanceOf(AbstractBindingHash);
      expect(new (<any> AbstractBindingHash)
        ({ bus: new Bus({ name: 'bus' }), name: 'actor', hashAlgorithm, digestAlgorithm}, 'distinct'))
              .toBeInstanceOf(Actor);
    });
    it('should not be able to create new AbstractBindingHash objects without \'new\'', () => {
      expect(() => { (<any> AbstractBindingHash)(); }).toThrow();
    });

    it('should not be able to create new AbstractBindingHash objects with an invalid hash algo', () => {
      expect(() => { new (<any> AbstractBindingHash) (
          { name: 'actor', bus, mediatorQueryOperation, hashAlgorithm: 'abc', digestAlgorithm }, 'distinct'); })
          .toThrow();
    });

    it('should not be able to create new AbstractBindingHash objects with an invalid digest algo', () => {
      expect(() => { new (<any> AbstractBindingHash) (
          { name: 'actor', bus, mediatorQueryOperation, hashAlgorithm, digestAlgorithm: 'abc' }, 'distinct'); })
          .toThrow();
    });
  });

  describe('#doesHashAlgorithmExist', () => {
    it('should be true on sha1', () => {
      return expect(AbstractBindingHash.doesHashAlgorithmExist('sha1')).toBeTruthy();
    });

    it('should be true on md5', () => {
      return expect(AbstractBindingHash.doesHashAlgorithmExist('md5')).toBeTruthy();
    });

    it('should not be true on something that does not exist', () => {
      return expect(AbstractBindingHash.doesHashAlgorithmExist('somethingthatdoesnotexist'))
                .toBeFalsy();
    });
  });

  describe('#doesDigestAlgorithmExist', () => {
    it('should be true on latin1', () => {
      return expect(AbstractBindingHash.doesDigestAlgorithmExist('latin1')).toBeTruthy();
    });

    it('should be true on hex', () => {
      return expect(AbstractBindingHash.doesDigestAlgorithmExist('hex')).toBeTruthy();
    });

    it('should be true on base64', () => {
      return expect(AbstractBindingHash.doesDigestAlgorithmExist('base64')).toBeTruthy();
    });

    it('should not be true on something that does not exist', () => {
      return expect(AbstractBindingHash.doesDigestAlgorithmExist('somethingthatdoesnotexist'))
                .toBeFalsy();
    });
  });

  describe('#hash', () => {
    it('should return the same hash for equal objects', () => {
      expect(AbstractBindingHash.hash('sha1', 'base64', { a: 'b' }))
                .toEqual(AbstractBindingHash.hash('sha1', 'base64', { a: 'b' }));
      expect(AbstractBindingHash.hash('sha1', 'base64', { a: 'c' }))
                .toEqual(AbstractBindingHash.hash('sha1', 'base64', { a: 'c' }));
      expect(AbstractBindingHash.hash('sha1', 'base64', 123))
                .toEqual(AbstractBindingHash.hash('sha1', 'base64', 123));
      expect(AbstractBindingHash.hash('sha1', 'base64', 'abcdefg'))
                .toEqual(AbstractBindingHash.hash('sha1', 'base64', 'abcdefg'));
    });

    it('should return a different hash for non-equal objects', () => {
      expect(AbstractBindingHash.hash('sha1', 'base64', { a: 'c' })).not
                .toEqual(AbstractBindingHash.hash('sha1', 'base64', { a: 'b' }));
      expect(AbstractBindingHash.hash('sha1', 'base64', { a: 'b' })).not
                .toEqual(AbstractBindingHash.hash('sha1', 'base64', { a: 'c' }));
      expect(AbstractBindingHash.hash('sha1', 'base64', 124)).not
                .toEqual(AbstractBindingHash.hash('sha1', 'base64', 123));
      expect(AbstractBindingHash.hash('sha1', 'base64', 'abcdefz')).not
                .toEqual(AbstractBindingHash.hash('sha1', 'base64', 'abcdefg'));
    });
  });

  describe('An AbstractBindingHash instance', () => {
    let m: AbstractBindingHash<Algebra.Distinct>;

    beforeEach(() => {
      m = new (class Mock extends AbstractBindingHash<Algebra.Distinct> {
        public newHashFilter() {
          return () => {
            return true;
          };
        }
      })({ name: 'actor', bus, mediatorQueryOperation, hashAlgorithm, digestAlgorithm }, 'distinct');

    });

    it('should run', () => {
      const op = { operation: { type: 'distinct' } };
      return m.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ totalItems: 5 });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: literal('1') }),
          Bindings({ a: literal('2') }),
          Bindings({ a: literal('1') }),
          Bindings({ a: literal('3') }),
          Bindings({ a: literal('2') }),
        ]);
      });
    });
    it('should test on distinct', () => {
      const op = { operation: { type: 'distinct' } };
      return expect(m.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-distinct', () => {
      const op = { operation: { type: 'some-other-type' } };
      return expect(m.test(op)).rejects.toBeTruthy();
    });

  });
});
