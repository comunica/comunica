import { BindingsFactory } from '@comunica/bindings-factory';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { FunctionArgumentsCache } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory } from 'sparqlalgebrajs';
import type { ExpressionEvaluator } from '../../../lib';
import { ExpressionEvaluatorFactory } from '../../../lib';
import { getMockExpression } from '../../util/utils';

const BF = new BindingsFactory();

describe('The ExpressionEvaluatorFactory', () => {
  let mediatorQueryOperation: any;
  let mediatorBindingsAggregatorFactory: any;
  let expressionEvaluatorFactory: ExpressionEvaluatorFactory;

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

    mediatorBindingsAggregatorFactory = {
      mediate: (arg: any) => Promise.reject(new Error('Not implemented')),
    };

    expressionEvaluatorFactory = new ExpressionEvaluatorFactory({
      mediatorBindingsAggregatorFactory,
      mediatorQueryOperation,
    });
  });

  describe('creates an evaluator with good defaults', () => {
    let evaluator: ExpressionEvaluator;

    beforeEach(() => {
      evaluator = expressionEvaluatorFactory.createEvaluator(getMockExpression('1+1'), new ActionContext({}));
    });

    it('empty contexts save for the bnode function', () => {
      expect(evaluator.context.bnode)
        .toEqual(expect.any(Function));
    });

    it('the bnode function should asynchronously return a blank node', async() => {
      const blankNodePromise = evaluator.context.bnode();
      expect(blankNodePromise).toBeInstanceOf(Promise);
      const blankNode = await blankNodePromise;
      expect(blankNode).toBeDefined();
      expect(blankNode).toHaveProperty('termType');
      expect(blankNode.termType).toEqual('BlankNode');
    });

    it('should create an object with a resolver', () => {
      const resolver = evaluator.context.exists;
      expect(resolver).toBeTruthy();
    });

    it('should allow a resolver to be invoked', async() => {
      const resolver = evaluator.context.exists;
      const factory = new Factory();
      const expr: Algebra.ExistenceExpression = factory.createExistenceExpression(
        true,
        factory.createBgp([]),
      );
      const result = resolver(expr, BF.bindings());
      expect(await result).toBe(true);
    });
  });

  it('should create an non-empty object for a filled context', () => {
    const date = new Date();
    const functionArgumentsCache: FunctionArgumentsCache = { apple: {}};
    const actionContext = new ActionContext({
      [KeysInitQuery.queryTimestamp.name]: date,
      [KeysInitQuery.baseIRI.name]: 'http://base.org/',
      [KeysInitQuery.functionArgumentsCache.name]: functionArgumentsCache,
    });
    const evaluator = expressionEvaluatorFactory.createEvaluator(getMockExpression('1+1'), actionContext);
    expect(evaluator.context).toMatchObject({
      now: date,
      bnode: expect.any(Function),
      baseIRI: 'http://base.org/',
      functionArgumentsCache,
      exists: expect.anything(),
    });
  });
});
