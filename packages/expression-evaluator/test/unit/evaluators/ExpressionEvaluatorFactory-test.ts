import { ActorExpressionEvaluatorFactoryBase } from '@comunica/actor-expression-evaluator-factory-base';
import type { ActorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import type { MediatorTermComparatorFactory } from '@comunica/bus-term-comparator-factory';
import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { FunctionArgumentsCache } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { getMockExpression } from '../../util/utils';

describe('The ExpressionEvaluatorFactory', () => {
  let mediatorQueryOperation: any;
  let mediatorBindingsAggregatorFactory: any;
  let expressionEvaluatorFactory: ActorExpressionEvaluatorFactory;

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

    expressionEvaluatorFactory = new ActorExpressionEvaluatorFactoryBase({
      name: 'ActorExpressionEvaluatorFactoryBase',
      bus: new Bus({ name: 'ExpressionEvaluatorFactoryBus' }),
      mediatorQueryOperation,
      mediatorBindingsAggregatorFactory,
      mediatorTermComparatorFactory: <MediatorTermComparatorFactory> mediatorQueryOperation,
    });
  });

  it('should create an non-empty object for a filled context', async() => {
    const date = new Date();
    const functionArgumentsCache: FunctionArgumentsCache = { apple: {}};
    const actionContext = new ActionContext({
      [KeysInitQuery.queryTimestamp.name]: date,
      [KeysInitQuery.baseIRI.name]: 'http://base.org/',
      [KeysInitQuery.functionArgumentsCache.name]: functionArgumentsCache,
    });
    const evaluator = (await expressionEvaluatorFactory.run({
      algExpr: getMockExpression('1 + 1'),
      context: actionContext,
    })).expressionEvaluator;
    expect(evaluator.context.toJS()).toMatchObject({
      [KeysExpressionEvaluator.now.name]: date,
      [KeysExpressionEvaluator.baseIRI.name]: 'http://base.org/',
      [KeysExpressionEvaluator.functionArgumentsCache.name]: functionArgumentsCache,
    });
  });
});
