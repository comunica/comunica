import { KeysInitSparql } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { ArrayIterator } from 'asynciterator';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory } from 'sparqlalgebrajs';
import { ActorQueryOperation, Bindings, getMetadata } from '..';

describe('ActorQueryOperation', () => {
  const bus = new Bus({ name: 'bus' });

  describe('The ActorQueryOperation module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperation).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperation constructor', () => {
      expect(new (<any> ActorQueryOperation)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperation objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperation)(); }).toThrow();
    });
  });

  describe('#getSafeBindings', () => {
    it('should return for bindings', () => {
      expect(() => ActorQueryOperation.getSafeBindings({ type: 'bindings' })).not.toThrow();
    });

    it('should error for non-bindings', () => {
      expect(() => ActorQueryOperation.getSafeBindings({ type: 'no-bindings' })).toThrow();
    });
  });

  describe('#getSafeQuads', () => {
    it('should return for quads', () => {
      expect(() => ActorQueryOperation.getSafeQuads({ type: 'quads' })).not.toThrow();
    });

    it('should error for non-quads', () => {
      expect(() => ActorQueryOperation.getSafeQuads({ type: 'no-quads' })).toThrow();
    });
  });

  describe('#getSafeBoolean', () => {
    it('should return for boolean', () => {
      expect(() => ActorQueryOperation.getSafeBoolean({ type: 'boolean' })).not.toThrow();
    });

    it('should error for non-boolean', () => {
      expect(() => ActorQueryOperation.getSafeBoolean({ type: 'no-boolean' })).toThrow();
    });
  });

  describe('#cachifyMetadata', () => {
    it('should remember an instance', () => {
      const cb = jest.fn(() => 'ABC');
      const cached = ActorQueryOperation.cachifyMetadata(<any> cb);
      expect(cached()).toEqual('ABC');
      expect(cached()).toEqual('ABC');
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });

  describe('#validateQueryOutput', () => {
    it('should return for boolean', () => {
      expect(() => ActorQueryOperation.validateQueryOutput({ type: 'boolean' }, 'boolean')).not.toThrow();
    });

    it('should error for non-boolean', () => {
      expect(() => ActorQueryOperation.validateQueryOutput({ type: 'no-boolean' }, 'boolean')).toThrow();
    });
  });

  describe('#getExpressionContext', () => {
    describe('without mediatorQueryOperation', () => {
      it('should create an empty object for an empty context', () => {
        expect(ActorQueryOperation.getExpressionContext(ActionContext({}))).toEqual({});
      });

      it('should create an non-empty object for a filled context', () => {
        const date = new Date();
        expect(ActorQueryOperation.getExpressionContext(ActionContext({
          [KeysInitSparql.queryTimestamp]: date,
          [KeysInitSparql.baseIRI]: 'http://base.org/',
        }))).toEqual({
          now: date,
          baseIRI: 'http://base.org/',
        });
      });
    });

    describe('with mediatorQueryOperation', () => {
      let mediatorQueryOperation: any;

      beforeEach(() => {
        mediatorQueryOperation = {
          mediate: (arg: any) => Promise.resolve({
            bindingsStream: new ArrayIterator([], { autoStart: false }),
            metadata: () => Promise.resolve({ totalItems: 0 }),
            operated: arg,
            type: 'bindings',
            variables: [ 'a' ],
          }),
        };
      });

      it('should create an object with a resolver', () => {
        const resolver = (<any> ActorQueryOperation
          .getExpressionContext(ActionContext({}), mediatorQueryOperation)).exists;
        expect(resolver).toBeTruthy();
      });

      it('should allow a resolver to be invoked', async() => {
        const resolver = (<any> ActorQueryOperation
          .getExpressionContext(ActionContext({}), mediatorQueryOperation)).exists;
        const factory = new Factory();
        const expr: Algebra.ExistenceExpression = factory.createExistenceExpression(
          true,
          factory.createBgp([]),
        );
        const result = resolver(expr, Bindings({}));
        expect(await result).toBe(true);
      });
    });
  });

  describe('#getMetadata', () => {
    it('should handle an empty promise for missing metadata', async() => {
      expect(await getMetadata({ type: 'none' })).toEqual({});
    });

    it('should handle a promise for metadata', async() => {
      expect(await getMetadata({ type: 'none', metadata: async() => ({ bla: true }) }))
        .toEqual({ bla: true });
    });
  });
});
