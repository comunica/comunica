import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import { TermFunctionBase } from '../lib/implementation/Core';

describe('TermFunctionBase', () => {
  const term1: any = { expressionType: 'term', value: 1 };
  const term2: any = { expressionType: 'term', value: 2 };
  const operator: any = { expressionType: 'operator' };
  let context: any;
  let concreteFunction: jest.Mock;
  let func: TermFunctionBase;

  beforeEach(() => {
    context = new ActionContext({
      [KeysExpressionEvaluator.superTypeProvider.name]: 'SUPER',
      [KeysInitQuery.functionArgumentsCache.name]: 'CACHE',
    });
    concreteFunction = jest.fn(() => (args: any[]) => ({ result: args }));
    func = new TermFunctionBase({
      arity: 2,
      operator: <any> 'op',
      overloads: <any> { search: jest.fn(() => concreteFunction) },
    });
  });

  describe('evaluateArgumentsDirectly', () => {
    it('should return undefined for evaluators that cannot evaluate directly', () => {
      expect(TermFunctionBase.evaluateArgumentsDirectly([ term1 ], <any> { context }, <any> {})).toBeUndefined();
    });

    it('should evaluate all arguments directly if possible', () => {
      const exprEval: any = { context, evaluateDirectly: jest.fn(arg => arg) };
      expect(TermFunctionBase.evaluateArgumentsDirectly([ term1, term2 ], exprEval, <any> 'MAPPING'))
        .toEqual([ term1, term2 ]);
      expect(exprEval.evaluateDirectly).toHaveBeenCalledWith(term1, 'MAPPING');
    });

    it('should return undefined if an argument cannot be evaluated directly', () => {
      const exprEval: any = { context, evaluateDirectly: jest.fn(arg => arg === operator ? undefined : arg) };
      expect(TermFunctionBase.evaluateArgumentsDirectly([ term1, operator ], exprEval, <any> {})).toBeUndefined();
    });
  });

  describe('apply', () => {
    it('should apply on arguments that are evaluated directly', async() => {
      const exprEval: any = {
        context,
        evaluateDirectly: jest.fn(arg => arg),
        evaluatorExpressionEvaluation: jest.fn(),
      };
      await expect(func.apply({ args: [ term1, term2 ], exprEval, mapping: <any> {}}))
        .resolves.toEqual({ result: [ term1, term2 ]});
      expect(exprEval.evaluatorExpressionEvaluation).not.toHaveBeenCalled();
    });

    it('should apply on arguments that are evaluated asynchronously otherwise', async() => {
      const exprEval: any = {
        context,
        evaluateDirectly: jest.fn(() => undefined),
        evaluatorExpressionEvaluation: jest.fn(async() => term2),
      };
      await expect(func.apply({ args: [ operator, term1 ], exprEval, mapping: <any> {}}))
        .resolves.toEqual({ result: [ term2, term2 ]});
    });

    it('should reject if a variable is unbound', async() => {
      const exprEval: any = {
        context,
        evaluateDirectly: jest.fn(() => {
          throw new Error('unbound');
        }),
      };
      await expect(func.apply({ args: [ term1 ], exprEval, mapping: <any> {}})).rejects.toThrow('unbound');
    });
  });

  describe('applyOnTerms', () => {
    it('should search an overload with the entries of the context', () => {
      const exprEval: any = { context };
      expect(func.applyOnTerms([ term1 ], exprEval)).toEqual({ result: [ term1 ]});
      expect((<any> func).overloads.search).toHaveBeenCalledWith([ term1 ], 'SUPER', 'CACHE');
    });
  });
});
