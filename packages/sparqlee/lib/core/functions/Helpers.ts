/**
 * These helpers provide a (albeit inflexible) DSL for writing function
 * definitions for the SPARQL functions.
 */

import { List, Map, Record } from 'immutable';

import * as C from '../../util/Consts';
import * as Err from '../../util/Errors';
import * as E from '../Expressions';

import { TypeURL as Type } from '../../util/Consts';
import { ArgumentType, OverloadMap } from './FunctionClasses';

type Term = E.TermExpression;
type OpFactory = (dt?: C.TypeURL) => E.SimpleApplication;

export function declare(): Builder {
  return new Builder();
}

export class Builder {
  private implementations: Impl[] = [];

  collect(): OverloadMap {
    return map(this.implementations);
  }

  log(): Builder {
    // tslint:disable-next-line:no-console
    console.log(this.implementations);
    return this;
  }

  add(impl: Impl): Builder {
    this.implementations.push(impl);
    return this;
  }

  set(argTypes: ArgumentType[], func: E.SimpleApplication): Builder {
    const types = List(argTypes);
    return this.add(new Impl({ types, func }));
  }

  copy({ from, to }: { from: ArgumentType[], to: ArgumentType[] }): Builder {
    const last = this.implementations.length - 1;
    const _from = List(from);
    for (let i = last; i >= 0; i--) {
      const impl = this.implementations[i];
      if (impl.get('types').equals(_from)) {
        return this.set(to, impl.get('func'));
      }
    }
    throw new Err.UnexpectedError(
      'Tried to copy implementation, but types not found',
      { from, to });
  }

  setUnary<T extends Term>(type: ArgumentType, op: (val: T) => Term) {
    return this.set([type], ([val]: [T]) => {
      return op(val);
    });
  }

  setLitUnary<T>(type: ArgumentType, op: (val: T) => Term) {
    return this.set([type], ([val]: [E.Literal<T>]) => {
      return op(val.typedValue);
    });
  }

  setLitBinary<L, R>(types: ArgumentType[], op: (left: L, right: R) => Term) {
    return this.set(types, ([left, right]: [E.Literal<L>, E.Literal<R>]) => {
      return op(left.typedValue, right.typedValue);
    });
  }

  setLitTernary<A1, A2, A3>(types: ArgumentType[], op: (a1: A1, a2: A2, a3: A3) => Term) {
    return this.set(types, ([a1, a2, a3]: [E.Literal<A1>, E.Literal<A2>, E.Literal<A3>]) => {
      return op(a1.typedValue, a2.typedValue, a3.typedValue);
    });
  }

  unimplemented(msg: string): Builder {
    for (let arity = 0; arity <= 5; arity++) {
      const types = Array(arity).fill('term');
      const func = (_args: Term[]) => { throw new Err.UnimplementedError(msg); };
      this.set(types, func);
    }
    return this;
  }

  onTerm1(op: (term: Term) => Term): Builder {
    return this.set(['term'], ([term]: [Term]) => op(term));
  }

  onLiteral1<T>(op: (lit: E.Literal<T>) => Term): Builder {
    return this.set(['literal'], ([term]: [E.Literal<T>]) => op(term));
  }

  onString1(op: (lit: E.Literal<string>) => Term): Builder {
    return this
      .set(['string'], ([lit]: [E.Literal<string>]) => op(lit))
      .set(['langString'], ([lit]: [E.Literal<string>]) => op(lit));
  }

  onNumeric1(op: (val: E.NumericLiteral) => Term): Builder {
    return this
      .set(['integer'], ([val]: [E.NumericLiteral]) => op(val))
      .set(['decimal'], ([val]: [E.NumericLiteral]) => op(val))
      .set(['float'], ([val]: [E.NumericLiteral]) => op(val))
      .set(['double'], ([val]: [E.NumericLiteral]) => op(val))
      .invalidLexicalForm(['nonlexical'], 1);
  }
  /*
  * Arithetic Operators take numbers, and return numbers.
  * Check 'numeric' for behaviour of the generic numeric helper.
  * https://www.w3.org/TR/sparql11-query/#OperatorMapping
  */
  arithmetic(op: (left: number, right: number) => number): Builder {
    const opFac = (dt?: Type) => ([left, right]: Array<E.Literal<number>>) =>
      number(op(left.typedValue, right.typedValue), dt || Type.XSD_FLOAT);
    return this.numeric(opFac);
  }

  numberTest(test: (left: number, right: number) => boolean): Builder {
    const func = ([left, right]: E.NumericLiteral[]) => {
      const result = test(left.typedValue, right.typedValue);
      return bool(result);
    };
    return this.numeric(() => func);
  }

  stringTest(test: (left: string, right: string) => boolean): Builder {
    return this
      .set(
        ['string', 'string'],
        ([left, right]: E.StringLiteral[]) => {
          const result = test(left.typedValue, right.typedValue);
          return bool(result);
        })
      .invalidLexicalForm(['nonlexical', 'string'], 1)
      .invalidLexicalForm(['string', 'nonlexical'], 2);
  }

  booleanTest(test: (left: boolean, right: boolean) => boolean): Builder {
    return this
      .set(
        ['boolean', 'boolean'],
        ([left, right]: E.BooleanLiteral[]) => {
          const result = test(left.typedValue, right.typedValue);
          return bool(result);
        })
      .invalidLexicalForm(['nonlexical', 'boolean'], 1)
      .invalidLexicalForm(['boolean', 'nonlexical'], 2);
  }

  dateTimeTest(test: (left: Date, right: Date) => boolean): Builder {
    return this
      .set(
        ['date', 'date'],
        ([left, right]: E.DateTimeLiteral[]) => {
          const result = test(left.typedValue, right.typedValue);
          return bool(result);
        })
      .invalidLexicalForm(['nonlexical', 'date'], 1)
      .invalidLexicalForm(['date', 'nonlexical'], 2);
  }

  numeric(opFac: OpFactory): Builder {
    return this
      .set(['integer', 'integer'], opFac(Type.XSD_INTEGER))
      .set(['integer', 'decimal'], opFac())
      .set(['integer', 'float'], opFac())
      .set(['integer', 'double'], opFac())
      .invalidLexicalForm(['integer', 'nonlexical'], 2)

      .set(['decimal', 'integer'], opFac())
      .set(['decimal', 'decimal'], opFac(Type.XSD_DECIMAL))
      .set(['decimal', 'float'], opFac())
      .set(['decimal', 'double'], opFac())
      .invalidLexicalForm(['decimal', 'nonlexical'], 2)

      .set(['float', 'integer'], opFac())
      .set(['float', 'decimal'], opFac())
      .set(['float', 'float'], opFac(Type.XSD_FLOAT))
      .set(['float', 'double'], opFac())
      .invalidLexicalForm(['float', 'nonlexical'], 2)

      .set(['double', 'integer'], opFac())
      .set(['double', 'decimal'], opFac())
      .set(['double', 'float'], opFac())
      .set(['double', 'double'], opFac(Type.XSD_DOUBLE))
      .invalidLexicalForm(['double', 'nonlexical'], 2)

      .invalidLexicalForm(['nonlexical', 'integer'], 1)
      .invalidLexicalForm(['nonlexical', 'decimal'], 1)
      .invalidLexicalForm(['nonlexical', 'float'], 1)
      .invalidLexicalForm(['nonlexical', 'double'], 1);

  }

  invalidLexicalForm(types: ArgumentType[], index: number): Builder {
    return this.set(types, (args: Term[]): E.TermExpression => {
      throw new Err.InvalidLexicalForm(args[index - 1].toRDF());
    });
  }

  private chain(impls: Impl[]): Builder {
    this.implementations = this.implementations.concat(impls);
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

export type ImplType = {
  types: List<ArgumentType>;
  func: E.SimpleApplication;
};

const implDefaults = {
  types: [] as ArgumentType[],
  func() {
    const msg = 'Implementation not set yet declared as implemented';
    throw new Err.UnexpectedError(msg);
  },
};

export class Impl extends Record(implDefaults) {

  constructor(params: ImplType) { super(params); }

  get<T extends keyof ImplType>(value: T): ImplType[T] {
    return super.get(value);
  }

  toPair(): [List<ArgumentType>, E.SimpleApplication] {
    return [this.get('types'), this.get('func')];
  }
}

export function map(implementations: Impl[]): OverloadMap {
  const typeImplPair = implementations.map((i) => i.toPair());
  return Map<List<ArgumentType>, E.SimpleApplication>(typeImplPair);
}

// ----------------------------------------------------------------------------
// Literal Construction helpers
// ----------------------------------------------------------------------------

export function bool(val: boolean): E.BooleanLiteral {
  return new E.BooleanLiteral(val);
}

export function number(num: number, dt?: C.TypeURL): E.NumericLiteral {
  return new E.NumericLiteral(num, undefined, C.make(dt || Type.XSD_FLOAT));
}

export function string(s: string): E.StringLiteral {
  return new E.StringLiteral(s);
}

export function dateTime(date: Date, str: string): E.DateTimeLiteral {
  return new E.DateTimeLiteral(date, str);
}
