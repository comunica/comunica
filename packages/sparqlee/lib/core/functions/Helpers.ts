/**
 * These helpers provide a (albeit inflexible) DSL for writing function
 * definitions for the SPARQL functions.
 */

import { List, Map, Record } from 'immutable';
import * as RDFDM from 'rdf-data-model';

import * as C from '../../util/Consts';
import * as E from '../Expressions';

import { DataType as DT } from '../../util/Consts';
import { InvalidLexicalForm, UnimplementedError, UnexpectedError } from '../../util/Errors';
import { ArgumentType, OverloadMap } from './Types';

// ----------------------------------------------------------------------------
// Literal Construction helpers
// ----------------------------------------------------------------------------

export function bool(val: boolean): E.BooleanLiteral {
  return new E.BooleanLiteral(val, undefined, C.make(DT.XSD_BOOLEAN));
}

export function number(num: number, dt?: C.DataType): E.NumericLiteral {
  return new E.NumericLiteral(num, undefined, C.make(dt || DT.XSD_FLOAT));
}

export function str(s: string): E.SimpleLiteral {
  return new E.SimpleLiteral(s, s);
}

export function list(...args: ArgumentType[]) {
  return List(args);
}

// ----------------------------------------------------------------------------
// Type helpers
// ----------------------------------------------------------------------------

type Term = E.TermExpression;

export type AliasType = 'stringly' | 'simple';
export function expand(allowedTypes: AliasType[]): ArgumentType[][] {
  const expandedArgs: ArgumentType[][] = allowedTypes.map((alias) => {
    if (alias === 'stringly') {
      const expanded: ArgumentType[] = ['simple', 'plain', 'string'];
      return expanded;
    }
    if (alias === 'simple') {
      const expanded: ArgumentType[] = ['simple', 'string'];
      return expanded;
    }
  });
  return cartesianProduct(expandedArgs);
}

export function forAll(allTypes: ArgumentType[][], func: E.SimpleApplication): OverloadMap {
  return map(allTypes.map((types) => new Impl({ types, func })));
}

function cartesianProduct<T>(arr: T[][]): T[][] {
  return arr.reduce((a, b) =>
    a.map((x) => b.map((y) => x.concat(y)))
      .reduce((_a, _b) => _a.concat(_b), []), [[]] as T[][]);
}

/*
* Arithetic Operators take numbers, and return numbers.
* Check 'numeric' for behaviour of the generic numeric helper.
* https://www.w3.org/TR/sparql11-query/#OperatorMapping
*/
export type ArithmeticOperator = (left: number, right: number) => number;
export function arithmetic(op: ArithmeticOperator): OverloadMap {
  const func = (dt?: DT) => (
    (args: Term[]) => number(binary(op, args), dt || DT.XSD_FLOAT)
  );
  return map(numeric(func));
}

/*
 * XPath Tests take numbers, booleans, strings, simple strings, and dates,
 * and they return booleans.
 * Check 'numeric' for behaviour of the generic numeric helper.
 * https://www.w3.org/TR/sparql11-query/#OperatorMapping
 */
export type XPathTest<T> = (left: T, right: T) => boolean;
export function xPathTest(
  numOp: XPathTest<number>,
  strOp: XPathTest<string>,
  boolOp: XPathTest<boolean>,
  dateOp: XPathTest<Date>,
): OverloadMap {
  const numericHelper = (args: Term[]) => bool(binary(numOp, args));

  const wrap = <T>(func: XPathTest<T>) => (args: Term[]) => bool(binary(func, args));
  return map([
    new Impl({ types: ['string', 'string'], func: wrap(strOp) }),
    new Impl({ types: ['simple', 'simple'], func: wrap(strOp) }),
    new Impl({ types: ['boolean', 'boolean'], func: wrap(boolOp) }),
    new Impl({ types: ['date', 'date'], func: wrap(dateOp) }),

    new Impl({ types: ['invalid', 'invalid'], func: invalidLexicalForm(1) }),
    new Impl({ types: ['invalid', 'string'], func: invalidLexicalForm(1) }),
    new Impl({ types: ['invalid', 'boolean'], func: invalidLexicalForm(1) }),
    new Impl({ types: ['invalid', 'date'], func: invalidLexicalForm(1) }),
    new Impl({ types: ['string', 'invalid'], func: invalidLexicalForm(2) }),
    new Impl({ types: ['boolean', 'invalid'], func: invalidLexicalForm(2) }),
    new Impl({ types: ['date', 'invalid'], func: invalidLexicalForm(2) }),

  ].concat(numeric((dt?: DT) => numericHelper)));
}

export type OpFactory = (dt?: C.DataType) => E.SimpleApplication;

/**
 * DataType will be generalized to float,
 * or to the the category-parent (interger, decimal, ...) if both have the same.
 */
export function numeric(opFac: OpFactory): Impl[] {
  return [
    new Impl({ types: ['integer', 'integer'], func: opFac(DT.XSD_INTEGER) }),
    new Impl({ types: ['integer', 'decimal'], func: opFac() }),
    new Impl({ types: ['integer', 'float'], func: opFac() }),
    new Impl({ types: ['integer', 'double'], func: opFac() }),
    new Impl({ types: ['integer', 'invalid'], func: invalidLexicalForm(2) }),

    new Impl({ types: ['decimal', 'integer'], func: opFac() }),
    new Impl({ types: ['decimal', 'decimal'], func: opFac(DT.XSD_DECIMAL) }),
    new Impl({ types: ['decimal', 'float'], func: opFac() }),
    new Impl({ types: ['decimal', 'double'], func: opFac() }),
    new Impl({ types: ['decimal', 'invalid'], func: invalidLexicalForm(2) }),

    new Impl({ types: ['float', 'integer'], func: opFac() }),
    new Impl({ types: ['float', 'decimal'], func: opFac() }),
    new Impl({ types: ['float', 'float'], func: opFac(DT.XSD_FLOAT) }),
    new Impl({ types: ['float', 'double'], func: opFac() }),
    new Impl({ types: ['float', 'invalid'], func: invalidLexicalForm(2) }),

    new Impl({ types: ['double', 'integer'], func: opFac() }),
    new Impl({ types: ['double', 'decimal'], func: opFac() }),
    new Impl({ types: ['double', 'float'], func: opFac() }),
    new Impl({ types: ['double', 'double'], func: opFac(DT.XSD_DOUBLE) }),
    new Impl({ types: ['double', 'invalid'], func: invalidLexicalForm(2) }),

    new Impl({ types: ['invalid', 'integer'], func: invalidLexicalForm(1) }),
    new Impl({ types: ['invalid', 'decimal'], func: invalidLexicalForm(1) }),
    new Impl({ types: ['invalid', 'float'], func: invalidLexicalForm(1) }),
    new Impl({ types: ['invalid', 'double'], func: invalidLexicalForm(1) }),
  ];
}

export type UnLiteralOp<T, R> = (val: T) => R;
export function unary<T, R>(op: UnLiteralOp<T, R>, args: E.TermExpression[]): R {
  const [val] = args as Array<E.Literal<T>>;
  return op(val.typedValue);
}

export type BinLiteralOp<T, R> = (left: T, right: T) => R;
export function binary<T, R>(op: BinLiteralOp<T, R>, args: E.TermExpression[]): R {
  const [left, right] = args as Array<E.Literal<T>>;
  return op(left.typedValue, right.typedValue);
}

// export type TernaryOp<T, R> = (val: T) => R;
// export function ternary<T, R>(op: UnLiteralOp<T, R>, args: E.TermExpression[]): R {
//   const [val] = args as Array<E.Literal<T>>;
//   return op(val.typedValue);
// }

function invalidLexicalForm(index: number) {
  return (args: Term[]) => {
    throw new InvalidLexicalForm(args[index - 1].toRDF());
  };
}

// ----------------------------------------------------------------------------
// Type Safety Helpers
// ----------------------------------------------------------------------------

// OverloadMap ----------------------------------------------------------------
/**
 * Immutable.js type definitions are pretty unsafe, and this is typo-prone work.
 * These helpers allow use to create OverloadMaps with more type-safety.
 * One entry in the OverloadMap is described by the record Impl;
 *
 * A list of Impl's then gets constructed into an Immutable.js Map.
 *
 * See:
 * https://medium.com/@alexxgent/enforcing-types-with-immutablejs-and-typescript-6ab980819b6a
 */

// tslint:disable-next-line:interface-over-type-literal
export type ImplType = {
  types: ArgumentType[];
  func: (args: E.TermExpression[]) => E.TermExpression;
};

function implDefaults() {
  return {
    types: [] as ArgumentType[],
    func(args: Term[]) {
      throw new UnexpectedError('Implementation for function not set but declared as implemented');
    },
  };
}

export class Impl extends Record(implDefaults()) {
  constructor(params: ImplType) { super(params); }
  get<T extends keyof ImplType>(value: T): ImplType[T] {
    return super.get(value);
  }
}

export function map(implementations: Impl[]): OverloadMap {
  return Map<List<ArgumentType>, E.SimpleApplication>(
    implementations.map((i) => [List(i.get('types')), i.get('func')]),
  );
}
