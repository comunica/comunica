import type { ExpressionEvaluator } from '@comunica/actor-expression-evaluator-factory-default/lib/ExpressionEvaluator';
import { regularFunctions } from '@comunica/actor-function-factory-wrapper-all/lib/implementation/RegularFunctions';
import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import { getMockEEActionContext, getMockEEFactory } from '@comunica/jest';
import type { ISuperTypeProvider } from '@comunica/types';
import { TypeURL } from '../../../lib';
import {
  IntegerLiteral,
  isLiteralTermExpression,
  Literal,
  StringLiteral,
} from '../../../lib/expressions';
import type { ISerializable } from '../../../lib/expressions';
import type { FunctionArgumentsCache } from '../../../lib/functions/OverloadTree';
import { OverloadTree } from '../../../lib/functions/OverloadTree';
import type { KnownLiteralTypes } from '../../../lib/util/Consts';
import { getMockExpression } from '../../util/utils';

describe('OverloadTree', () => {
  let emptyTree: OverloadTree;
  const emptyID = 'Non cacheable';
  let expressionEvaluator: ExpressionEvaluator;
  let superTypeProvider: ISuperTypeProvider;
  let functionArgumentsCache: FunctionArgumentsCache;
  beforeEach(async() => {
    emptyTree = new OverloadTree(emptyID);
    expressionEvaluator = <ExpressionEvaluator> await getMockEEFactory().run(
      { algExpr: getMockExpression('true'), context: getMockEEActionContext() },
    );
    superTypeProvider = expressionEvaluator.context.getSafe(KeysExpressionEvaluator.superTypeProvider);
    functionArgumentsCache = expressionEvaluator.context.getSafe(KeysInitQuery.functionArgumentsCache);
  });

  function typePromotionTest<T extends ISerializable>(
    tree: OverloadTree,
    promoteFrom: KnownLiteralTypes,
    promoteTo: KnownLiteralTypes,
    value: T,
    valueToEqual?: T,
  ): void {
    tree.addOverload([ promoteTo ], () => ([ arg ]) => arg);
    const arg = new Literal<T>(value, promoteFrom);
    const res = isLiteralTermExpression(tree
      .search([ arg ], superTypeProvider, functionArgumentsCache)!(
      expressionEvaluator,
    )([ arg ]));
    expect(res).toBeTruthy();
    expect(res!.dataType).toEqual(promoteTo);
    expect(res!.typedValue).toEqual(valueToEqual ?? value);
  }

  function subtypeSubstitutionTest<T extends ISerializable>(
    tree: OverloadTree,
    argumentType: KnownLiteralTypes,
    expectedType: KnownLiteralTypes,
    value: T,
  ): void {
    tree.addOverload([ expectedType ], () => ([ arg ]) => arg);
    const arg = new Literal<T>(value, argumentType);
    const res = isLiteralTermExpression(tree
      .search([ arg ], superTypeProvider, functionArgumentsCache)!(
      expressionEvaluator,
    )([ arg ]));
    expect(res).toBeTruthy();
    expect(res!.dataType).toEqual(argumentType);
    expect(res!.typedValue).toEqual(value);
  }

  describe('handles Type Promotion', () => {
    it('promotes ANY_URI to STRING', () => {
      typePromotionTest(emptyTree, TypeURL.XSD_ANY_URI, TypeURL.XSD_STRING, 'www.any-uri.com');
    });

    it('promotes FLOAT to DOUBLE', () => {
      typePromotionTest(emptyTree, TypeURL.XSD_FLOAT, TypeURL.XSD_DOUBLE, '0');
    });

    it('promotes DECIMAL to FLOAT', () => {
      typePromotionTest(emptyTree, TypeURL.XSD_DECIMAL, TypeURL.XSD_FLOAT, '0');
    });

    it('promotes DECIMAL to DOUBLE', () => {
      typePromotionTest(emptyTree, TypeURL.XSD_DECIMAL, TypeURL.XSD_DOUBLE, '0');
    });
  });

  describe('handles subtype substitution', () => {
    it('substitutes SHORT into DECIMAL', () => {
      subtypeSubstitutionTest(emptyTree, TypeURL.XSD_SHORT, TypeURL.XSD_DECIMAL, '0');
    });

    it('substitutes TOKEN into STRING', () => {
      subtypeSubstitutionTest(emptyTree, TypeURL.XSD_TOKEN, TypeURL.XSD_STRING, '');
    });
  });

  it('can handle both substitution and promotion at once', () => {
    emptyTree.addOverload([ TypeURL.XSD_DOUBLE ], () => ([ arg ]) => arg);

    const arg = new Literal<number>(0, TypeURL.XSD_SHORT);
    const res = isLiteralTermExpression(emptyTree
      .search([ arg ], superTypeProvider, functionArgumentsCache)!(
      expressionEvaluator,
    )([ arg ]));
    expect(res).toBeTruthy();
    expect(res!.dataType).toEqual(TypeURL.XSD_DOUBLE);
    expect(res!.typedValue).toBe(0);
  });

  it('can handle unknown literal dataType', () => {
    emptyTree.addOverload([ 'term' ], () => ([ arg ]) => arg);
    const dataType = 'www.example.com#weird-string';
    const litValue = 'weird';
    const arg = new Literal<string>(litValue, dataType);
    const res = isLiteralTermExpression(emptyTree
      .search([ arg ], superTypeProvider, functionArgumentsCache)!(
      expressionEvaluator,
    )([ arg ]));
    expect(res).toBeTruthy();
    expect(res!.dataType).toEqual(dataType);
    expect(res!.typedValue).toEqual(litValue);
  });

  it('will cache addition function', () => {
    const one = new IntegerLiteral(1);
    const two = new IntegerLiteral(2);
    expect(functionArgumentsCache['+']).toBeUndefined();
    const res = regularFunctions['+'].applyOnTerms([ one, two ], expressionEvaluator);
    expect(res.str()).toBe('3');
    // One time lookup + one time add
    expect(functionArgumentsCache['+']).toBeDefined();
    regularFunctions['+'].applyOnTerms([ two, one ], expressionEvaluator);

    const innerSpy = jest.fn();
    const spy = jest.fn(() => innerSpy);
    functionArgumentsCache['+'].cache![TypeURL.XSD_INTEGER].cache![TypeURL.XSD_INTEGER].func = spy;
    regularFunctions['+'].applyOnTerms([ one, two ], expressionEvaluator);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(innerSpy).toHaveBeenCalledTimes(1);
  });

  it('searches the cache arity aware', () => {
    const apple = new StringLiteral('apple');
    const one = new IntegerLiteral(1);
    const two = new IntegerLiteral(2);
    expect(functionArgumentsCache.substr).toBeUndefined();
    expect(regularFunctions.substr.applyOnTerms([ apple, one, two ], expressionEvaluator).str()).toBe('ap');

    expect(functionArgumentsCache.substr).toBeDefined();
    const interestCache = functionArgumentsCache.substr
      .cache![TypeURL.XSD_STRING].cache![TypeURL.XSD_INTEGER];
    expect(interestCache.func).toBeUndefined();
    expect(interestCache.cache![TypeURL.XSD_INTEGER]).toBeDefined();

    expect(regularFunctions.substr.applyOnTerms([ apple, one ], expressionEvaluator).str()).toBe(String('apple'));
    const interestCacheNew = functionArgumentsCache.substr
      .cache![TypeURL.XSD_STRING].cache![TypeURL.XSD_INTEGER];
    expect(interestCacheNew).toBeDefined();
    expect(interestCacheNew.cache![TypeURL.XSD_INTEGER]).toBeDefined();
  });

  it('will not cache an undefined function', () => {
    const cache: FunctionArgumentsCache = {};
    const args = [ new StringLiteral('some str') ];
    emptyTree.search(args, superTypeProvider, cache);
    expect(cache[emptyID]).toBeUndefined();
  });
});
