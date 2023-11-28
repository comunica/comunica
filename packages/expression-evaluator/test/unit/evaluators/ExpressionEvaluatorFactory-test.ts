import { BindingsFactory } from '@comunica/bindings-factory';
import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { FunctionArgumentsCache } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
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

  it('should create an non-empty object for a filled context', async() => {
    const date = new Date();
    const functionArgumentsCache: FunctionArgumentsCache = { apple: {}};
    const actionContext = new ActionContext({
      [KeysInitQuery.queryTimestamp.name]: date,
      [KeysInitQuery.baseIRI.name]: 'http://base.org/',
      [KeysInitQuery.functionArgumentsCache.name]: functionArgumentsCache,
    });
    const evaluator = await expressionEvaluatorFactory.createEvaluator(getMockExpression('1+1'), actionContext);
    expect(evaluator.context.toJS()).toMatchObject({
      [KeysExpressionEvaluator.now.name]: date,
      [KeysExpressionEvaluator.baseIRI.name]: 'http://base.org/',
      [KeysExpressionEvaluator.functionArgumentsCache.name]: functionArgumentsCache,
    });
  });
});
