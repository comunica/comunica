import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { FunctionArgumentsCache } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory } from 'sparqlalgebrajs';
import { ActorQueryOperation } from '..';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

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
      expect(() => {
        (<any> ActorQueryOperation)();
      }).toThrow(`Class constructor ActorQueryOperation cannot be invoked without 'new'`);
    });
  });

  describe('#getExpressionContext', () => {
    describe('without mediatorQueryOperation', () => {
      it('should create an object for an empty contexts save for the bnode function', () => {
        expect(ActorQueryOperation.getExpressionContext(
          new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
        ).bnode)
          .toEqual(expect.any(Function));
      });

      it('the bnode function should synchronously return a blank node', () => {
        const context = ActorQueryOperation.getExpressionContext(new ActionContext({
          [KeysInitQuery.dataFactory.name]: DF,
        }));
        const blankNode = context.bnode();
        expect(blankNode).toBeDefined();
        expect(blankNode).toHaveProperty('termType');
        expect(blankNode.termType).toBe('BlankNode');
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
      expect(ActorQueryOperation.getAsyncExpressionContext(new ActionContext({
        [KeysInitQuery.dataFactory.name]: DF,
      }), mediatorQueryOperation, BF).bnode)
        .toEqual(expect.any(Function));
    });

    it('the bnode function should asynchronously return a blank node', async() => {
      const context = ActorQueryOperation.getAsyncExpressionContext(new ActionContext({
        [KeysInitQuery.dataFactory.name]: DF,
      }), mediatorQueryOperation, BF);
      const blankNodePromise = context.bnode();
      expect(blankNodePromise).toBeInstanceOf(Promise);
      const blankNode = await blankNodePromise;
      expect(blankNode).toBeDefined();
      expect(blankNode).toHaveProperty('termType');
      expect(blankNode.termType).toBe('BlankNode');
    });

    it('should create an non-empty object for a filled context', () => {
      const date = new Date();
      const functionArgumentsCache: FunctionArgumentsCache = { apple: {}};
      expect(ActorQueryOperation.getAsyncExpressionContext(new ActionContext({
        [KeysInitQuery.dataFactory.name]: DF,
        [KeysInitQuery.queryTimestamp.name]: date,
        [KeysInitQuery.baseIRI.name]: 'http://base.org/',
        [KeysInitQuery.functionArgumentsCache.name]: functionArgumentsCache,
      }), mediatorQueryOperation, BF)).toEqual({
        dataFactory: DF,
        now: date,
        bnode: expect.any(Function),
        baseIRI: 'http://base.org/',
        functionArgumentsCache,
        exists: expect.anything(),
      });
    });

    it('should create an object with a resolver', () => {
      const resolver = (<any>ActorQueryOperation
        .getAsyncExpressionContext(new ActionContext({
          [KeysInitQuery.dataFactory.name]: DF,
        }), mediatorQueryOperation, BF)).exists;
      expect(resolver).toBeTruthy();
    });

    it('should allow a resolver to be invoked', async() => {
      const resolver = (<any>ActorQueryOperation
        .getAsyncExpressionContext(new ActionContext({
          [KeysInitQuery.dataFactory.name]: DF,
        }), mediatorQueryOperation, BF)).exists;
      const factory = new Factory();
      const expr: Algebra.ExistenceExpression = factory.createExistenceExpression(
        true,
        factory.createBgp([]),
      );
      const result = resolver(expr, BF.bindings());
      await expect(result).resolves.toBe(true);
    });
  });
});
