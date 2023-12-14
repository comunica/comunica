import { bool, declare } from '@comunica/bus-functions/lib/implementation/Helpers';
import type { Builder } from '@comunica/bus-functions/lib/implementation/Helpers';
import type { FunctionArgumentsCache } from '@comunica/bus-functions/lib/implementation/OverloadTree';
import { KeysExpressionEvaluator } from '@comunica/context-entries';
import { getMockEEFactory } from '@comunica/jest';
import type { ExpressionEvaluator } from '../../../lib';
import { TypeURL } from '../../../lib';
import { getMockEEActionContext, getMockExpression } from '../../util/utils';

import fn = jest.fn;
import type { ISuperTypeProvider } from '@comunica/types';

describe('The function helper file', () => {
  describe('has a builder', () => {
    let builder: Builder;
    let expressionEvaluator: ExpressionEvaluator;
    let superTypeProvider: ISuperTypeProvider;
    let functionArgumentsCache: FunctionArgumentsCache;
    beforeEach(async() => {
      builder = declare('non cacheable');
      expressionEvaluator = <ExpressionEvaluator> (await getMockEEFactory().run({
        algExpr: getMockExpression('1 + 1'),
        context: getMockEEActionContext(),
      })).expressionEvaluator;
      superTypeProvider = expressionEvaluator.context.getSafe(KeysExpressionEvaluator.superTypeProvider);
      functionArgumentsCache = expressionEvaluator.context.getSafe(KeysExpressionEvaluator.functionArgumentsCache);
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
      expect(func).toBeCalledTimes(1);
    });

    it('defines a function onBoolean1', () => {
      const func = fn();
      const args = [ bool(true) ];
      builder.onBoolean1(() => func).collect()
        .search(args, superTypeProvider, functionArgumentsCache)!(
        expressionEvaluator,
      )(args);
      expect(func).toBeCalledTimes(1);
    });
  });
});
