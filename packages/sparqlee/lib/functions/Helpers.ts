/**
 * These helpers provide a (albeit inflexible) DSL for writing function
 * definitions for the SPARQL functions.
 */

// eslint-disable-next-line no-redeclare
import { List, Map } from 'immutable';

import * as E from '../expressions';
import type { SimpleApplication } from '../expressions';
import * as C from '../util/Consts';
import { TypeURL } from '../util/Consts';
import * as Err from '../util/Errors';

import type { ArgumentType, OverloadMap } from './Core';
import { promote } from './Core';

type Term = E.TermExpression;

export function declare(): Builder {
  return new Builder();
}

export class Builder {
  private implementations: Impl[] = [];

  public collect(): OverloadMap {
    return map(this.implementations);
  }

  public add(impl: Impl): Builder {
    this.implementations.push(impl);
    return this;
  }

  public set(argTypes: ArgumentType[], func: E.SimpleApplication): Builder {
    const types = List(argTypes);
    return this.add(new Impl({ types, func }));
  }

  public copy({ from, to }: { from: ArgumentType[]; to: ArgumentType[] }): Builder {
    const last = this.implementations.length - 1;
    const _from = List(from);
    for (let i = last; i >= 0; i--) {
      const impl = this.implementations[i];
      if (impl.types.equals(_from)) {
        return this.set(to, impl.func);
      }
    }
    throw new Err.UnexpectedError(
      'Tried to copy implementation, but types not found',
      { from, to },
    );
  }

  public onUnary<T extends Term>(type: ArgumentType, op: (val: T) => Term): Builder {
    return this.set([ type ], ([ val ]: [T]) => op(val));
  }

  public onUnaryTyped<T>(type: ArgumentType, op: (val: T) => Term): Builder {
    return this.set([ type ], ([ val ]: [E.Literal<T>]) => op(val.typedValue));
  }

  public onBinary<L extends Term, R extends Term>(types: ArgumentType[], op: (left: L, right: R) => Term): Builder {
    return this.set(types, ([ left, right ]: [L, R]) => op(left, right));
  }

  public onBinaryTyped<L, R>(types: ArgumentType[], op: (left: L, right: R) => Term): Builder {
    return this.set(types, ([ left, right ]: [E.Literal<L>, E.Literal<R>]) => op(left.typedValue, right.typedValue));
  }

  public onTernaryTyped<A1, A2, A3>(types: ArgumentType[], op: (a1: A1, a2: A2, a3: A3) => Term): Builder {
    return this.set(types, ([ a1, a2, a3 ]: [E.Literal<A1>, E.Literal<A2>, E.Literal<A3>]) =>
      op(a1.typedValue, a2.typedValue, a3.typedValue));
  }

  public onTernary<
    A1 extends Term,
    A2 extends Term,
    A3 extends Term
  >(types: ArgumentType[], op: (a1: A1, a2: A2, a3: A3) => Term): Builder {
    return this.set(types, ([ a1, a2, a3 ]: [A1, A2, A3]) => op(a1, a2, a3));
  }

  public onQuaternaryTyped<A1, A2, A3, A4>(types: ArgumentType[], op: (a1: A1, a2: A2, a3: A3, a4: A4) => Term):
  Builder {
    return this.set(types, ([ a1, a2, a3, a4 ]: [E.Literal<A1>, E.Literal<A2>, E.Literal<A3>, E.Literal<A4>]) =>
      op(a1.typedValue, a2.typedValue, a3.typedValue, a4.typedValue));
  }

  public unimplemented(msg: string): Builder {
    for (let arity = 0; arity <= 5; arity++) {
      const types: ArgumentType[] = <ArgumentType[]> Array.from({ length: arity }).fill('term');
      const func: SimpleApplication = (_args: Term[]) => {
        throw new Err.UnimplementedError(msg);
      };
      this.set(types, func);
    }
    return this;
  }

  public onTerm1(op: (term: Term) => Term): Builder {
    return this.set([ 'term' ], ([ term ]: [Term]) => op(term));
  }

  public onLiteral1<T>(op: (lit: E.Literal<T>) => Term): Builder {
    return this.set([ 'literal' ], ([ term ]: [E.Literal<T>]) => op(term));
  }

  public onBoolean1(op: (lit: E.BooleanLiteral) => Term): Builder {
    return this
      .set([ 'boolean' ], ([ lit ]: [E.BooleanLiteral]) => op(lit));
  }

  public onBoolean1Typed(op: (lit: boolean) => Term): Builder {
    return this
      .set([ 'boolean' ], ([ lit ]: [E.BooleanLiteral]) => op(lit.typedValue));
  }

  public onString1(op: (lit: E.Literal<string>) => Term): Builder {
    return this
      .set([ 'string' ], ([ lit ]: [E.Literal<string>]) => op(lit));
  }

  public onString1Typed(op: (lit: string) => Term): Builder {
    return this
      .set([ 'string' ], ([ lit ]: [E.Literal<string>]) => op(lit.typedValue));
  }

  public onLangString1(op: (lit: E.LangStringLiteral) => Term): Builder {
    return this
      .set([ 'langString' ], ([ lit ]: [E.LangStringLiteral]) => op(lit));
  }

  public onStringly1(op: (lit: E.Literal<string>) => Term): Builder {
    return this
      .set([ 'string' ], ([ lit ]: [E.Literal<string>]) => op(lit))
      .set([ 'langString' ], ([ lit ]: [E.Literal<string>]) => op(lit));
  }

  public onStringly1Typed(op: (lit: string) => Term): Builder {
    return this
      .set([ 'string' ], ([ lit ]: [E.Literal<string>]) => op(lit.typedValue))
      .set([ 'langString' ], ([ lit ]: [E.Literal<string>]) => op(lit.typedValue));
  }

  public onNumeric1(op: (val: E.NumericLiteral) => Term): Builder {
    return this
      .set([ 'integer' ], ([ val ]: [E.NumericLiteral]) => op(val))
      .set([ 'decimal' ], ([ val ]: [E.NumericLiteral]) => op(val))
      .set([ 'float' ], ([ val ]: [E.NumericLiteral]) => op(val))
      .set([ 'double' ], ([ val ]: [E.NumericLiteral]) => op(val))
      .invalidLexicalForm([ 'nonlexical' ], 1);
  }

  public onDateTime1(op: (date: E.DateTimeLiteral) => Term): Builder {
    return this
      .set([ 'date' ], ([ val ]: [E.DateTimeLiteral]) => op(val))
      .invalidLexicalForm([ 'nonlexical' ], 1);
  }

  /**
   * Arithmetic operators take 2 numeric arguments, and return a single numerical
   * value. The type of the return value is heavily dependant on the types of the
   * input arguments. In JS everything is a double, but in SPARQL it is not.
   *
   * {@link https://www.w3.org/TR/sparql11-query/#OperatorMapping}
   * {@link https://www.w3.org/TR/xpath-functions/#op.numeric}
   *
   * @param op the (simple) binary mathematical operator that
   */
  public arithmetic(op: (left: number, right: number) => number): Builder {
    return this.numeric(([ left, right ]: E.NumericLiteral[]) => {
      const promotionType = promote(left.type, right.type);
      const resultType = C.decategorize(promotionType);
      return number(op(left.typedValue, right.typedValue), resultType);
    });
  }

  public numberTest(test: (left: number, right: number) => boolean): Builder {
    return this.numeric(([ left, right ]: E.NumericLiteral[]) => {
      const result = test(left.typedValue, right.typedValue);
      return bool(result);
    });
  }

  public stringTest(test: (left: string, right: string) => boolean): Builder {
    return this
      .set(
        [ 'string', 'string' ],
        ([ left, right ]: E.StringLiteral[]) => {
          const result = test(left.typedValue, right.typedValue);
          return bool(result);
        },
      )
      .invalidLexicalForm([ 'nonlexical', 'string' ], 1)
      .invalidLexicalForm([ 'string', 'nonlexical' ], 2);
  }

  public booleanTest(test: (left: boolean, right: boolean) => boolean): Builder {
    return this
      .set(
        [ 'boolean', 'boolean' ],
        ([ left, right ]: E.BooleanLiteral[]) => {
          const result = test(left.typedValue, right.typedValue);
          return bool(result);
        },
      )
      .invalidLexicalForm([ 'nonlexical', 'boolean' ], 1)
      .invalidLexicalForm([ 'boolean', 'nonlexical' ], 2);
  }

  public dateTimeTest(test: (left: Date, right: Date) => boolean): Builder {
    return this
      .set(
        [ 'date', 'date' ],
        ([ left, right ]: E.DateTimeLiteral[]) => {
          const result = test(left.typedValue, right.typedValue);
          return bool(result);
        },
      )
      .invalidLexicalForm([ 'nonlexical', 'date' ], 1)
      .invalidLexicalForm([ 'date', 'nonlexical' ], 2);
  }

  public numeric(op: E.SimpleApplication): Builder {
    return this
      .set([ 'integer', 'integer' ], op)
      .set([ 'integer', 'decimal' ], op)
      .set([ 'integer', 'float' ], op)
      .set([ 'integer', 'double' ], op)
      .invalidLexicalForm([ 'integer', 'nonlexical' ], 2)

      .set([ 'decimal', 'integer' ], op)
      .set([ 'decimal', 'decimal' ], op)
      .set([ 'decimal', 'float' ], op)
      .set([ 'decimal', 'double' ], op)
      .invalidLexicalForm([ 'decimal', 'nonlexical' ], 2)

      .set([ 'float', 'integer' ], op)
      .set([ 'float', 'decimal' ], op)
      .set([ 'float', 'float' ], op)
      .set([ 'float', 'double' ], op)
      .invalidLexicalForm([ 'float', 'nonlexical' ], 2)

      .set([ 'double', 'integer' ], op)
      .set([ 'double', 'decimal' ], op)
      .set([ 'double', 'float' ], op)
      .set([ 'double', 'double' ], op)
      .invalidLexicalForm([ 'double', 'nonlexical' ], 2)

      .invalidLexicalForm([ 'nonlexical', 'integer' ], 1)
      .invalidLexicalForm([ 'nonlexical', 'decimal' ], 1)
      .invalidLexicalForm([ 'nonlexical', 'float' ], 1)
      .invalidLexicalForm([ 'nonlexical', 'double' ], 1);
  }

  public invalidLexicalForm(types: ArgumentType[], index: number): Builder {
    return this.set(types, (args: Term[]): E.TermExpression => {
      throw new Err.InvalidLexicalForm(args[index - 1].toRDF());
    });
  }

  private chain(impls: Impl[]): Builder {
    this.implementations = [ ...this.implementations, ...impls ];
    return this;
  }
}

// ----------------------------------------------------------------------------
// Type Safety Helpers
// ----------------------------------------------------------------------------

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

export interface IImplType {
  types: List<ArgumentType>;
  func: E.SimpleApplication;
}

const implDefaults: IImplType = {
  types: List(),
  func() {
    const msg = 'Implementation not set yet declared as implemented';
    throw new Err.UnexpectedError(msg);
  },
};

export class Impl implements IImplType {
  public types: List<ArgumentType>;
  public func: E.SimpleApplication;

  public constructor(params?: IImplType) {
    this.init(params || implDefaults);
  }

  private init(params: IImplType): void {
    this.types = params.types;
    this.func = params.func;
  }
}

export function map(implementations: Impl[]): OverloadMap {
  const typeImplPair = implementations.map(i => [ i.types, i.func ]);
  return Map<List<ArgumentType>, E.SimpleApplication>(typeImplPair);
}

// ----------------------------------------------------------------------------
// Literal Construction helpers
// ----------------------------------------------------------------------------

export function bool(val: boolean): E.BooleanLiteral {
  return new E.BooleanLiteral(val);
}

export function number(num: number, dt?: C.TypeURL): E.NumericLiteral {
  return new E.NumericLiteral(num, C.make(dt || TypeURL.XSD_FLOAT), undefined);
}

export function numberFromString(str: string, dt?: C.TypeURL): E.NumericLiteral {
  const num = Number(str);
  return new E.NumericLiteral(num, C.make(dt || TypeURL.XSD_FLOAT), undefined);
}

export function string(str: string): E.StringLiteral {
  return new E.StringLiteral(str);
}

export function langString(str: string, lang: string): E.LangStringLiteral {
  return new E.LangStringLiteral(str, lang);
}

export function dateTime(date: Date, str: string): E.DateTimeLiteral {
  return new E.DateTimeLiteral(date, str);
}

// ----------------------------------------------------------------------------
// Util
// ----------------------------------------------------------------------------

export function typeCheckLit<T>(
  term: E.TermExpression,
  allowed: ArgumentType[],
  args: E.Expression[],
  op: C.Operator,
): E.Literal<T> {
  if (term.termType !== 'literal') {
    throw new Err.InvalidArgumentTypes(args, op);
  }

  const lit = <E.Literal<any>> term;

  if (!allowed.includes(lit.type)) {
    throw new Err.InvalidArgumentTypes(args, op);
  }

  return lit;
}
