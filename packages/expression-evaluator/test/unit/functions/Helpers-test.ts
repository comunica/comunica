import type { ExpressionEvaluator } from '@comunica/actor-expression-evaluator-factory-default/lib/ExpressionEvaluator';
import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import { getMockEEActionContext, getMockEEFactory } from '@comunica/jest';
import type { ISuperTypeProvider } from '@comunica/types';
import { TypeURL } from '../../../lib';
import { bool, declare } from '../../../lib/functions/Helpers';
import type { Builder } from '../../../lib/functions/Helpers';
import type { FunctionArgumentsCache } from '../../../lib/functions/OverloadTree';
import { getMockExpression } from '../../util/utils';

import fn = jest.fn;

describe('The function helper file', () => {
  describe('has a builder', () => {
    let builder: Builder;
    let expressionEvaluator: ExpressionEvaluator;
    let superTypeProvider: ISuperTypeProvider;
    let functionArgumentsCache: FunctionArgumentsCache;
    beforeEach(async() => {
      builder = declare('non cacheable');
      expressionEvaluator = <ExpressionEvaluator> await getMockEEFactory().run({
        algExpr: getMockExpression('true'),
        context: getMockEEActionContext(),
      });
      superTypeProvider = expressionEvaluator.context.getSafe(KeysExpressionEvaluator.superTypeProvider);
      functionArgumentsCache = expressionEvaluator.context.getSafe(KeysInitQuery.functionArgumentsCache);
    });

    it('can only be collected once', () => {
      builder.collect();
      expect(() => builder.collect()).toThrow('only be collected once');
    });

    it('throws error when copy is not possible', () => {
      expect(() =>
        builder.copy({ from: [ 'term' ], to: [ TypeURL.XSD_STRING ]})).toThrow('types not found');
    });

    it('defines a function onUnaryTyped', () => {
      const func = fn();
      const args = [ bool(true) ];
      builder.onUnaryTyped(TypeURL.XSD_BOOLEAN, () => func).collect()
        .search(args, superTypeProvider, functionArgumentsCache)!(
        expressionEvaluator,
      )(args);
      expect(func).toHaveBeenCalledTimes(1);
    });

    it('defines a function onBoolean1', () => {
      const func = fn();
      const args = [ bool(true) ];
      builder.onBoolean1(() => func).collect()
        .search(args, superTypeProvider, functionArgumentsCache)!(
        expressionEvaluator,
      )(args);
      expect(func).toHaveBeenCalledTimes(1);
    });
  });
});
