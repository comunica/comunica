import type { ExpressionEvaluator } from '@comunica/actor-expression-evaluator-factory-default';
import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import type { FunctionArgumentsCache, ISuperTypeProvider } from '@comunica/types';
import { getMockEEActionContext, getMockEEFactory, getMockExpression } from '@comunica/utils-jest';
import type { Builder } from '../../../lib';
import { NonLexicalLiteral, TypeURL, bool, declare, integer, nonLexicalComparisonHandler } from '../../../lib';

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
      }, undefined);
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

    it('defines a function onTerm3', () => {
      const func = fn();
      const args = [ bool(true), bool(true), bool(true) ];
      builder.onTerm3(() => func).collect()
        .search(args, superTypeProvider, functionArgumentsCache)!(
        expressionEvaluator,
      )(args);
      expect(func).toHaveBeenCalledTimes(1);
    });
  });

  describe('nonLexicalComparisonHandler', () => {
    const getExpressionEvaluator =
      async(nonLexicalComparison = false) => <ExpressionEvaluator> await getMockEEFactory().run({
        algExpr: getMockExpression('true'),
        context: getMockEEActionContext().set(KeysExpressionEvaluator.nonLexicalComparison, nonLexicalComparison),
      }, undefined);
    let nonLexicalOperand: NonLexicalLiteral;

    beforeEach(async() => {
      nonLexicalOperand = new NonLexicalLiteral(
        undefined,
        TypeURL.XSD_INTEGER,
        <any> {},
        'abc',
      );
    });

    describe('with non-lexical operands', () => {
      it('throw when nonLexicalComparison is false', async() => {
        const exprEval = await getExpressionEvaluator();
        expect(() => nonLexicalComparisonHandler(exprEval, nonLexicalOperand, integer(0)))
          .toThrow('Invalid lexical form');
      });

      it('return comparison result when nonLexicalComparison is true', async() => {
        const exprEval = await getExpressionEvaluator(true);
        expect(() => nonLexicalComparisonHandler(exprEval, nonLexicalOperand, integer(0))).not.toThrow();
      });
    });

    describe('without non-lexical operands', () => {
      it('returns undefined', async() => {
        const exprEval = await getExpressionEvaluator();
        expect(nonLexicalComparisonHandler(exprEval, integer(0), integer(1))).toBeUndefined();
      });
    });
  });
});
