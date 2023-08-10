import { BindingsFactory } from '@comunica/bindings-factory';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { MetadataValidationState } from '@comunica/metadata';
import type { FunctionArgumentsCache } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory } from 'sparqlalgebrajs';
import { ActorQueryOperation } from '..';

const BF = new BindingsFactory({});

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
      expect(() => ActorQueryOperation.getSafeBindings(<any>{ type: 'bindings' })).not.toThrow();
    });

    it('should error for non-bindings', () => {
      expect(() => ActorQueryOperation.getSafeBindings(<any>{ type: 'no-bindings' })).toThrow();
    });
  });

  describe('#getSafeQuads', () => {
    it('should return for quads', () => {
      expect(() => ActorQueryOperation.getSafeQuads(<any>{ type: 'quads' })).not.toThrow();
    });

    it('should error for non-quads', () => {
      expect(() => ActorQueryOperation.getSafeQuads(<any>{ type: 'no-quads' })).toThrow();
    });
  });

  describe('#getSafeBoolean', () => {
    it('should return for boolean', () => {
      expect(() => ActorQueryOperation.getSafeBoolean(<any>{ type: 'boolean' })).not.toThrow();
    });

    it('should error for non-boolean', () => {
      expect(() => ActorQueryOperation.getSafeBoolean(<any>{ type: 'no-boolean' })).toThrow();
    });
  });

  describe('#cachifyMetadata', () => {
    it('should remember an instance', async() => {
      let counter = 0;
      const cb = jest.fn(async() => ({ state: new MetadataValidationState(), value: counter++ }));
      const cached = ActorQueryOperation.cachifyMetadata(<any> cb);
      expect((await cached()).value).toEqual(0);
      expect((await cached()).value).toEqual(0);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('should handle invalidation', async() => {
      let counter = 0;
      const state = new MetadataValidationState();
      const cb = jest.fn(async() => ({ state, value: counter++ }));
      const cached = ActorQueryOperation.cachifyMetadata(<any> cb);
      expect((await cached()).value).toEqual(0);
      expect((await cached()).value).toEqual(0);
      expect(cb).toHaveBeenCalledTimes(1);

      state.invalidate();
      expect((await cached()).value).toEqual(1);
      expect((await cached()).value).toEqual(1);
      expect(cb).toHaveBeenCalledTimes(2);
    });
  });

  describe('#validateQueryOutput', () => {
    it('should return for boolean', () => {
      expect(() => ActorQueryOperation.validateQueryOutput(<any>{ type: 'boolean' }, 'boolean')).not.toThrow();
    });

    it('should error for non-boolean', () => {
      expect(() => ActorQueryOperation.validateQueryOutput(<any>{ type: 'no-boolean' }, 'boolean')).toThrow();
    });
  });

  describe('#getExpressionContext', () => {
    describe('without mediatorQueryOperation', () => {
      it('should create an object for an empty contexts save for the bnode function', () => {
        expect(ActorQueryOperation.getExpressionContext(new ActionContext()).bnode)
          .toEqual(expect.any(Function));
      });

      it('the bnode function should synchronously return a blank node', () => {
        const context = ActorQueryOperation.getExpressionContext(new ActionContext());
        const blankNode = context.bnode();
        expect(blankNode).toBeDefined();
        expect(blankNode).toHaveProperty('termType');
        expect(blankNode.termType).toEqual('BlankNode');
      });
    });
  });

  describe('#getAsyncExpressionContext', () => {
    let mediatorQueryOperation: any;

    beforeEach(() => {
      mediatorQueryOperation = {
        mediate: (arg: any) => Promise.resolve({
          bindingsStream: new ArrayIterator([], { autoStart: false }),
          metadata: () => Promise.resolve({ cardinality: 0 }),
          operated: arg,
          type: 'bindings',
          variables: [ 'a' ],
        }),
      };
    });

    it('should create an object for an empty contexts save for the bnode function', () => {
      expect(ActorQueryOperation.getAsyncExpressionContext(new ActionContext(), mediatorQueryOperation, BF).bnode)
        .toEqual(expect.any(Function));
    });

    it('the bnode function should asynchronously return a blank node', async() => {
      const context = ActorQueryOperation.getAsyncExpressionContext(new ActionContext(), mediatorQueryOperation, BF);
      const blankNodePromise = context.bnode();
      expect(blankNodePromise).toBeInstanceOf(Promise);
      const blankNode = await blankNodePromise;
      expect(blankNode).toBeDefined();
      expect(blankNode).toHaveProperty('termType');
      expect(blankNode.termType).toEqual('BlankNode');
    });

    it('should create an non-empty object for a filled context', () => {
      const date = new Date();
      const functionArgumentsCache: FunctionArgumentsCache = { apple: {}};
      expect(ActorQueryOperation.getAsyncExpressionContext(new ActionContext({
        [KeysInitQuery.queryTimestamp.name]: date,
        [KeysInitQuery.baseIRI.name]: 'http://base.org/',
        [KeysInitQuery.functionArgumentsCache.name]: functionArgumentsCache,
      }), mediatorQueryOperation, BF)).toEqual({
        now: date,
        bnode: expect.any(Function),
        baseIRI: 'http://base.org/',
        functionArgumentsCache,
        exists: expect.anything(),
      });
    });

    it('should create an object with a resolver', () => {
      const resolver = (<any>ActorQueryOperation
        .getAsyncExpressionContext(new ActionContext(), mediatorQueryOperation, BF)).exists;
      expect(resolver).toBeTruthy();
    });

    it('should allow a resolver to be invoked', async() => {
      const resolver = (<any>ActorQueryOperation
        .getAsyncExpressionContext(new ActionContext(), mediatorQueryOperation, BF)).exists;
      const factory = new Factory();
      const expr: Algebra.ExistenceExpression = factory.createExistenceExpression(
        true,
        factory.createBgp([]),
      );
      const result = resolver(expr, BF.bindings());
      expect(await result).toBe(true);
    });
  });
});
