import * as LRUCache from 'lru-cache';
import type { ICompleteSharedContext } from '../../../lib/evaluators/evaluatorHelpers/BaseExpressionEvaluator';
import { IntegerLiteral, isLiteralTermExpression, Literal, StringLiteral } from '../../../lib/expressions';
import { OverloadTree, regularFunctions } from '../../../lib/functions';
import type { OverLoadCache } from '../../../lib/functions/OverloadTree';
import type { KnownLiteralTypes } from '../../../lib/util/Consts';
import { TypeURL } from '../../../lib/util/Consts';
import { getDefaultSharedContext } from '../../util/utils';

describe('OverloadTree', () => {
  let emptyTree: OverloadTree;
  let sharedContext: ICompleteSharedContext;
  beforeEach(() => {
    emptyTree = new OverloadTree('Non cacheable');
    sharedContext = { ...getDefaultSharedContext(), enableExtendedXsdTypes: true };
  });

  function typePromotionTest<T>(tree: OverloadTree, promoteFrom: KnownLiteralTypes, promoteTo: KnownLiteralTypes,
    value: T, valueToEqual?: T) {
    tree.addOverload([ promoteTo ], () => ([ arg ]) => arg);
    const arg = new Literal<T>(value, promoteFrom);
    const res = isLiteralTermExpression(tree
      .search([ arg ], sharedContext.superTypeProvider, sharedContext.overloadCache)!(sharedContext)([ arg ]));
    expect(res).toBeTruthy();
    expect(res!.dataType).toEqual(promoteTo);
    expect(res!.typedValue).toEqual(valueToEqual || value);
  }

  function subtypeSubstitutionTest<T>(tree: OverloadTree, argumentType: KnownLiteralTypes,
    expectedType: KnownLiteralTypes, value: T) {
    tree.addOverload([ expectedType ], () => ([ arg ]) => arg);
    const arg = new Literal<T>(value, argumentType);
    const res = isLiteralTermExpression(tree
      .search([ arg ], sharedContext.superTypeProvider, sharedContext.overloadCache)!(sharedContext)([ arg ]));
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
      .search([ arg ], sharedContext.superTypeProvider, sharedContext.overloadCache)!(sharedContext)([ arg ]));
    expect(res).toBeTruthy();
    expect(res!.dataType).toEqual(TypeURL.XSD_DOUBLE);
    expect(res!.typedValue).toEqual(0);
  });

  it('can handle unknown literal dataType', () => {
    emptyTree.addOverload([ 'term' ], () => ([ arg ]) => arg);
    const dataType = 'www.example.com#weird-string';
    const litValue = 'weird';
    const arg = new Literal<string>(litValue, dataType);
    const res = isLiteralTermExpression(emptyTree
      .search([ arg ], sharedContext.superTypeProvider, sharedContext.overloadCache)!(sharedContext)([ arg ]));
    expect(res).toBeTruthy();
    expect(res!.dataType).toEqual(dataType);
    expect(res!.typedValue).toEqual(litValue);
  });

  it('will cache addition function', () => {
    const one = new IntegerLiteral(1);
    const two = new IntegerLiteral(2);
    const spy = jest.spyOn(sharedContext.overloadCache, 'get');
    regularFunctions['+'].apply([ one, two ], sharedContext);
    expect(spy).toBeCalledTimes(0);
    regularFunctions['+'].apply([ two, one ], sharedContext);
    expect(spy).toBeCalledTimes(1);
    regularFunctions['+'].apply([ two, one ], sharedContext);
    expect(spy).toBeCalledTimes(2);
  });

  it('will cache an undefined function', () => {
    const cache: OverLoadCache = new LRUCache();
    const spy = jest.spyOn(cache, 'get');
    const args = [ new StringLiteral('some str') ];
    emptyTree.search(args, sharedContext.superTypeProvider, cache);
    expect(spy).toBeCalledTimes(0);
    emptyTree.search(args, sharedContext.superTypeProvider, cache);
    expect(spy).toBeCalledTimes(1);
  });
});
