/**
 * This test exercises the named re-exports in utils-jest/lib/index.ts
 * to ensure Istanbul registers coverage for those getter functions.
 */
import {
  BF,
  date,
  DF,
  float,
  getMockEEActionContext,
  getMockEEFactory,
  getMockInternalEvaluator,
  getMockMediatorExpressionEvaluatorFactory,
  getMockMediatorFunctionFactory,
  getMockMediatorMergeBindingsContext,
  getMockMediatorQueryOperation,
  getMockSuperTypeProvider,
  makeAggregate,
  nonLiteral,
  string,
  termDecimal,
  termDouble,
  termInt,
} from '../../lib';

describe('utils-jest index re-exports', () => {
  it('exports helpers from the package index', () => {
    expect(BF).toBeDefined();
    expect(DF).toBeDefined();
    expect(date).toBeDefined();
    expect(float).toBeDefined();
    expect(getMockEEActionContext).toBeDefined();
    expect(getMockEEFactory).toBeDefined();
    expect(getMockInternalEvaluator).toBeDefined();
    expect(getMockMediatorExpressionEvaluatorFactory).toBeDefined();
    expect(getMockMediatorFunctionFactory).toBeDefined();
    expect(getMockMediatorMergeBindingsContext).toBeDefined();
    expect(getMockMediatorQueryOperation).toBeDefined();
    expect(getMockSuperTypeProvider).toBeDefined();
    expect(makeAggregate).toBeDefined();
    expect(nonLiteral).toBeDefined();
    expect(string).toBeDefined();
    expect(termInt).toBeDefined();
    expect(termDecimal).toBeDefined();
    expect(termDouble).toBeDefined();
  });
});
