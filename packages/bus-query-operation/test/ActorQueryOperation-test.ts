import { KeysInitSparql } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { ArrayIterator } from 'asynciterator';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory } from 'sparqlalgebrajs';
import * as uuid from 'uuid';
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
      it('should create an empty object for an empty contexts save for the bnode function', () => {
        expect(ActorQueryOperation.getExpressionContext(ActionContext({})))
          .toEqual({ bnode: expect.any(Function) });
      });

      it('the bnode function should synchronously return a blank node', () => {
        const context = ActorQueryOperation.getExpressionContext(ActionContext({}));
        const blankNode = context.bnode();
        expect(blankNode).toBeDefined();
        expect(blankNode).toHaveProperty('termType');
        expect(blankNode.termType).toEqual('BlankNode');
      });
    });
  });

  describe('#getAsyncExpressionContext', () => {
    describe('without mediatorQueryOperation', () => {
      it('should create an empty object for an empty contexts save for the bnode function', () => {
        expect(ActorQueryOperation.getAsyncExpressionContext(ActionContext({})))
          .toEqual({ bnode: expect.any(Function) });
      });

      it('the bnode function should asynchronously return a blank node', async() => {
        const context = ActorQueryOperation.getAsyncExpressionContext(ActionContext({}));
        const blankNodePromise = context.bnode();
        expect(blankNodePromise).toBeInstanceOf(Promise);
        const blankNode = await blankNodePromise;
        expect(blankNode).toBeDefined();
        expect(blankNode).toHaveProperty('termType');
        expect(blankNode.termType).toEqual('BlankNode');
      });

      it('should create an non-empty object for a filled context', () => {
        const date = new Date();
        expect(ActorQueryOperation.getAsyncExpressionContext(ActionContext({
          [KeysInitSparql.queryTimestamp]: date,
          [KeysInitSparql.baseIRI]: 'http://base.org/',
        }))).toEqual({
          now: date,
          bnode: expect.any(Function),
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
          .getAsyncExpressionContext(ActionContext({}), mediatorQueryOperation)).exists;
        expect(resolver).toBeTruthy();
      });

      it('should allow a resolver to be invoked', async() => {
        const resolver = (<any> ActorQueryOperation
          .getAsyncExpressionContext(ActionContext({}), mediatorQueryOperation)).exists;
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
