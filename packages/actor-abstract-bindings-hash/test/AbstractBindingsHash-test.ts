import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  Bindings,
} from '@comunica/bus-query-operation';
import { Actor, Bus } from '@comunica/core';
import type { IActorQueryOperationOutputBindings } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra } from 'sparqlalgebrajs';
import { AbstractBindingsHash } from '..';
const arrayifyStream = require('arrayify-stream');
const DF = new DataFactory();

describe('AbstractBindingsHash', () => {
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
        canContainUndefs: false,
      }),
    };
  });

  describe('The AbstractBindingsHash module', () => {
    it('should be a function', () => {
      expect(AbstractBindingsHash).toBeInstanceOf(Function);
    });

    it('should be a AbstractBindingsHash constructor', () => {
      // eslint-disable-next-line @typescript-eslint/func-call-spacing
      expect(new (<any> AbstractBindingsHash)
      ({ bus: new Bus({ name: 'bus' }), name: 'actor' }, 'distinct'))
        .toBeInstanceOf(AbstractBindingsHash);
      // eslint-disable-next-line @typescript-eslint/func-call-spacing
      expect(new (<any> AbstractBindingsHash)
      ({ bus: new Bus({ name: 'bus' }), name: 'actor' }, 'distinct'))
        .toBeInstanceOf(Actor);
    });
    it('should not be able to create new AbstractBindingsHash objects without \'new\'', () => {
      expect(() => { (<any> AbstractBindingsHash)(); }).toThrow();
    });
  });

  describe('An AbstractBindingsHash instance', () => {
    let m: AbstractBindingsHash<Algebra.Distinct>;
    beforeEach(() => {
      m = new class Mock extends AbstractBindingsHash<Algebra.Distinct> {
        public newHashFilter() {
          return () => {
            return true;
          };
        }
      }({ name: 'actor', bus, mediatorQueryOperation }, 'distinct');
    });

    it('should run', () => {
      const op = { operation: { type: 'distinct' }};
      return m.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await (<any> output).metadata()).toEqual({ totalItems: 5 });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(output.canContainUndefs).toEqual(false);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: DF.literal('1') }),
          Bindings({ a: DF.literal('2') }),
          Bindings({ a: DF.literal('1') }),
          Bindings({ a: DF.literal('3') }),
          Bindings({ a: DF.literal('2') }),
        ]);
      });
    });
    it('should test on distinct', () => {
      const op = { operation: { type: 'distinct' }};
      return expect(m.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-distinct', () => {
      const op = { operation: { type: 'some-other-type' }};
      return expect(m.test(op)).rejects.toBeTruthy();
    });
  });
});
