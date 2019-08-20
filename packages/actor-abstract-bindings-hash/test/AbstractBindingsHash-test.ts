import {
    Bindings,
    IActorQueryOperationOutputBindings,
    IActorQueryOperationTypedMediatedArgs,
} from "@comunica/bus-query-operation";
import {Actor, Bus} from "@comunica/core";
import {literal} from "@rdfjs/data-model";
import {ArrayIterator} from "asynciterator";
import {Algebra} from "sparqlalgebrajs";
import {AbstractBindingsHash} from "..";
const arrayifyStream = require('arrayify-stream');

describe('AbstractBindingsHash', () => {
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

  describe('The AbstractBindingsHash module', () => {
    it('should be a function', () => {
      expect(AbstractBindingsHash).toBeInstanceOf(Function);
    });

    it('should be a AbstractBindingsHash constructor', () => {
      expect(new (<any> AbstractBindingsHash)
      ({ bus: new Bus({ name: 'bus' }), name: 'actor', hashAlgorithm, digestAlgorithm}, 'distinct'))
              .toBeInstanceOf(AbstractBindingsHash);
      expect(new (<any> AbstractBindingsHash)
        ({ bus: new Bus({ name: 'bus' }), name: 'actor', hashAlgorithm, digestAlgorithm}, 'distinct'))
              .toBeInstanceOf(Actor);
    });
    it('should not be able to create new AbstractBindingsHash objects without \'new\'', () => {
      expect(() => { (<any> AbstractBindingsHash)(); }).toThrow();
    });

    it('should not be able to create new AbstractBindingsHash objects with an invalid hash algo', () => {
      expect(() => { new (<any> AbstractBindingsHash) (
          { name: 'actor', bus, mediatorQueryOperation, hashAlgorithm: 'abc', digestAlgorithm }, 'distinct'); })
          .toThrow();
    });

    it('should not be able to create new AbstractBindingsHash objects with an invalid digest algo', () => {
      expect(() => { new (<any> AbstractBindingsHash) (
          { name: 'actor', bus, mediatorQueryOperation, hashAlgorithm, digestAlgorithm: 'abc' }, 'distinct'); })
          .toThrow();
    });
  });

  describe('An AbstractBindingsHash instance', () => {
    let m: AbstractBindingsHash<Algebra.Distinct>;
    beforeEach(() => {
      m = new (class Mock extends AbstractBindingsHash<Algebra.Distinct> {
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
