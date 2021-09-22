/**
 * These helpers provide a (albeit inflexible) DSL for writing function
 * definitions for the SPARQL functions.
 */
import type { ICompleteSharedContext } from '../evaluators/evaluatorHelpers/BaseExpressionEvaluator';
import type { Literal, NumericLiteral } from '../expressions';
import * as E from '../expressions';
import { DecimalLiteral, DoubleLiteral, FloatLiteral, IntegerLiteral } from '../expressions';
import type { MainNumericSparqlType } from '../util/Consts';
import * as C from '../util/Consts';
import { TypeAlias, TypeURL } from '../util/Consts';
import * as Err from '../util/Errors';
import { isInternalSubType } from '../util/TypeHandling';
import type { ExperimentalArgumentType } from './Core';
import { LegacyTree } from './LegacyTree';
import type { ImplementationFunction } from './OverloadTree';
import { OverloadTree } from './OverloadTree';

type Term = E.TermExpression;

export function declare(identifier: string): Builder {
  return new Builder(identifier);
}

export class Builder {
  private readonly overloadTree: OverloadTree;
  private readonly legacyTree: LegacyTree;
  private collected: boolean;

  public constructor(identifier: string) {
    this.overloadTree = new OverloadTree(identifier);
    this.legacyTree = new LegacyTree();
    this.collected = false;
  }

  public collect(): { experimentalTree: OverloadTree; tree: LegacyTree } {
    if (this.collected) {
      // Only 1 time allowed because we can't copy a tree. (And we don't need this).
      throw new Error('Builders can only be collected once!');
    }
    this.collected = true;
    return { experimentalTree: this.overloadTree, tree: this.legacyTree };
  }

  public set(argTypes: ExperimentalArgumentType[], func: ImplementationFunction): Builder {
    this.overloadTree.addOverload(argTypes, func);
    this.legacyTree.addOverload(argTypes, func);
    return this;
  }

  /**
   * A legacy function should be set only after all other functions are set
   * @param argTypes
   * @param func
   */
  public setLegacy(argTypes: ExperimentalArgumentType[], func: ImplementationFunction): Builder {
    this.legacyTree.addLegacyOverload(argTypes, func);
    return this;
  }

  public copy({ from, to }: { from: ExperimentalArgumentType[]; to: ExperimentalArgumentType[] }): Builder {
    const impl = this.overloadTree.getImplementationExact(from);
    if (!impl) {
      throw new Err.UnexpectedError(
        'Tried to copy implementation, but types not found',
        { from, to },
      );
    }
    return this.set(to, impl);
  }

  public onUnary<T extends Term>(type: ExperimentalArgumentType, op: (context: ICompleteSharedContext) =>
  (val: T) => Term): Builder {
    return this.set([ type ], context => ([ val ]: [T]) => op(context)(val));
  }

  public onUnaryTyped<T>(type: ExperimentalArgumentType,
    op: (context: ICompleteSharedContext) => (val: T) => Term): Builder {
    return this.set([ type ], context => ([ val ]: [E.Literal<T>]) => op(context)(val.typedValue));
  }

  public onBinary<L extends Term, R extends Term>(types: ExperimentalArgumentType[],
    op: (context: ICompleteSharedContext) => (left: L, right: R) => Term): Builder {
    return this.set(types, context => ([ left, right ]: [L, R]) => op(context)(left, right));
  }

  public onBinaryTyped<L, R>(types: ExperimentalArgumentType[],
    op: (context: ICompleteSharedContext) => (left: L, right: R) => Term): Builder {
    return this.set(types, context =>
      ([ left, right ]: [E.Literal<L>, E.Literal<R>]) => op(context)(left.typedValue, right.typedValue));
  }

  public onTernaryTyped<A1, A2, A3>(types: ExperimentalArgumentType[],
    op: (context: ICompleteSharedContext) => (a1: A1, a2: A2, a3: A3) => Term): Builder {
    return this.set(types, context => ([ a1, a2, a3 ]: [E.Literal<A1>, E.Literal<A2>, E.Literal<A3>]) =>
      op(context)(a1.typedValue, a2.typedValue, a3.typedValue));
  }

  public onTernary<A1 extends Term, A2 extends Term, A3 extends Term>(types: ExperimentalArgumentType[],
    op: (context: ICompleteSharedContext) => (a1: A1, a2: A2, a3: A3) => Term): Builder {
    return this.set(types, context => ([ a1, a2, a3 ]: [A1, A2, A3]) => op(context)(a1, a2, a3));
  }

  public onQuaternaryTyped<A1, A2, A3, A4>(types: ExperimentalArgumentType[],
    op: (context: ICompleteSharedContext) => (a1: A1, a2: A2, a3: A3, a4: A4) => Term): Builder {
    return this.set(types, context =>
      ([ a1, a2, a3, a4 ]: [E.Literal<A1>, E.Literal<A2>, E.Literal<A3>, E.Literal<A4>]) =>
        op(context)(a1.typedValue, a2.typedValue, a3.typedValue, a4.typedValue));
  }

  public onTerm1(op: (context: ICompleteSharedContext) => (term: Term) => Term): Builder {
    return this.set([ 'term' ], context => ([ term ]: [Term]) => op(context)(term));
  }

  public onLiteral1<T>(op: (context: ICompleteSharedContext) => (lit: E.Literal<T>) => Term): Builder {
    return this.set([ 'literal' ], context => ([ term ]: [E.Literal<T>]) => op(context)(term));
  }

  public onBoolean1(op: (context: ICompleteSharedContext) => (lit: E.BooleanLiteral) => Term): Builder {
    return this
      .set([ C.TypeURL.XSD_BOOLEAN ], context => ([ lit ]: [E.BooleanLiteral]) => op(context)(lit));
  }

  public onBoolean1Typed(op: (context: ICompleteSharedContext) => (lit: boolean) => Term): Builder {
    return this
      .set([ C.TypeURL.XSD_BOOLEAN ], context => ([ lit ]: [E.BooleanLiteral]) => op(context)(lit.typedValue));
  }

  public onString1(op: (context: ICompleteSharedContext) => (lit: E.Literal<string>) => Term): Builder {
    return this
      .set([ C.TypeURL.XSD_STRING ], context => ([ lit ]: [E.Literal<string>]) => op(context)(lit));
  }

  public onString1Typed(op: (context: ICompleteSharedContext) => (lit: string) => Term): Builder {
    return this
      .set([ C.TypeURL.XSD_STRING ], context => ([ lit ]: [E.Literal<string>]) => op(context)(lit.typedValue));
  }

  public onLangString1(op: (context: ICompleteSharedContext) => (lit: E.LangStringLiteral) => Term): Builder {
    return this
      .set([ C.TypeURL.RDF_LANG_STRING ], context => ([ lit ]: [E.LangStringLiteral]) => op(context)(lit));
  }

  public onStringly1(op: (context: ICompleteSharedContext) => (lit: E.Literal<string>) => Term): Builder {
    return this
      .set([ C.TypeAlias.SPARQL_STRINGLY ], context => ([ lit ]: [E.Literal<string>]) => op(context)(lit));
  }

  public onStringly1Typed(op: (context: ICompleteSharedContext) => (lit: string) => Term): Builder {
    return this
      .set([ C.TypeAlias.SPARQL_STRINGLY ], context => ([ lit ]: [E.Literal<string>]) => op(context)(lit.typedValue));
  }

  public onNumeric1(op: (context: ICompleteSharedContext) => (val: E.NumericLiteral) => Term): Builder {
    return this
      .set([ C.TypeAlias.SPARQL_NUMERIC ], context => ([ val ]: [E.NumericLiteral]) => op(context)(val))
      .invalidLexicalForm([ C.TypeAlias.SPARQL_NON_LEXICAL ], 1);
  }

  public onDateTime1(op: (context: ICompleteSharedContext) => (date: E.DateTimeLiteral) => Term): Builder {
    return this
      .set([ C.TypeURL.XSD_DATE_TIME ], context => ([ val ]: [E.DateTimeLiteral]) => op(context)(val))
      .invalidLexicalForm([ C.TypeAlias.SPARQL_NON_LEXICAL ], 1);
  }

  /**
   * We return the base types and not the provided types because we don't want to create invalid terms.
   * Providing negative number to a function unary - for example should not
   * return a term of type negative number having a positive value.
   * @param op the numeric operator performed
   */
  public numericConverter(op: (context: ICompleteSharedContext) => (val: number) => number): Builder {
    const evalHelper = (context: ICompleteSharedContext) => (arg: Term): number =>
      op(context)((<Literal<number>>arg).typedValue);
    return this.onBinary([ TypeURL.XSD_INTEGER ], context => arg =>
      integer(evalHelper(context)(arg)))
      .onBinary([ TypeURL.XSD_DECIMAL ], context => arg =>
        decimal(evalHelper(context)(arg)))
      .onBinary([ TypeURL.XSD_FLOAT ], context => arg =>
        float(evalHelper(context)(arg)))
      .onBinary([ TypeURL.XSD_DOUBLE ], context => arg =>
        double(evalHelper(context)(arg)))
      .invalidLexicalForm([ C.TypeAlias.SPARQL_NON_LEXICAL ], 1);
  }

  private static readonly legacyArithmeticPromotion: Record<MainNumericSparqlType,
  Record<MainNumericSparqlType, (num: number) => NumericLiteral>> = {
    integer: {
      integer: num => new IntegerLiteral(num),
      decimal: num => new DecimalLiteral(num),
      float: num => new FloatLiteral(num),
      double: num => new DoubleLiteral(num),
    },
    decimal: {
      integer: num => new DecimalLiteral(num),
      decimal: num => new DecimalLiteral(num),
      float: num => new FloatLiteral(num),
      double: num => new DoubleLiteral(num),
    },
    float: {
      integer: num => new FloatLiteral(num),
      decimal: num => new FloatLiteral(num),
      float: num => new FloatLiteral(num),
      double: num => new DoubleLiteral(num),
    },
    double: {
      integer: num => new DoubleLiteral(num),
      decimal: num => new DoubleLiteral(num),
      float: num => new DoubleLiteral(num),
      double: num => new DoubleLiteral(num),
    },
  };

  /**
   * !!! Be aware when using this function, it will create different overloads with different return types !!!
   * Arithmetic operators take 2 numeric arguments, and return a single numerical
   * value. The type of the return value is heavily dependant on the types of the
   * input arguments. In JS everything is a double, but in SPARQL it is not.
   *
   * The different arguments are handled by type promotion and subtype substitution.
   * The way numeric function arguments work is described here:
   * https://www.w3.org/TR/xpath20/#mapping
   * Above url is referenced in the sparql spec: https://www.w3.org/TR/sparql11-query/#OperatorMapping
   */
  public arithmetic(op: (context: ICompleteSharedContext) => (left: number, right: number) => number): Builder {
    const evalHelper = (context: ICompleteSharedContext) => (left: Term, right: Term): number =>
      op(context)((<Literal<number>>left).typedValue, (<Literal<number>>right).typedValue);
    return this.onBinary([ TypeURL.XSD_INTEGER, TypeURL.XSD_INTEGER ], context => (left, right) =>
      integer(evalHelper(context)(left, right)))
      .onBinary([ TypeURL.XSD_DECIMAL, TypeURL.XSD_DECIMAL ], context => (left, right) =>
        decimal(evalHelper(context)(left, right)))
      .onBinary([ TypeURL.XSD_FLOAT, TypeURL.XSD_FLOAT ], context => (left, right) =>
        float(evalHelper(context)(left, right)))
      .onBinary([ TypeURL.XSD_DOUBLE, TypeURL.XSD_DOUBLE ], context => (left, right) =>
        double(evalHelper(context)(left, right)))
      .setLegacy([ TypeAlias.SPARQL_NUMERIC, TypeAlias.SPARQL_NUMERIC ], (context: ICompleteSharedContext) =>
        ([ left, right ]: [NumericLiteral, NumericLiteral]) =>
          Builder.legacyArithmeticPromotion[left.mainSparqlType][right.mainSparqlType](
            op(context)(left.typedValue, right.typedValue),
          ));
  }

  public numberTest(test: (context: ICompleteSharedContext) => (left: number, right: number) => boolean): Builder {
    return this.numeric(context => ([ left, right ]: E.NumericLiteral[]) => {
      const result = test(context)(left.typedValue, right.typedValue);
      return bool(result);
    });
  }

  public stringTest(test: (context: ICompleteSharedContext) => (left: string, right: string) => boolean): Builder {
    return this
      .set(
        [ C.TypeURL.XSD_STRING, C.TypeURL.XSD_STRING ],
        context => ([ left, right ]: E.StringLiteral[]) => {
          const result = test(context)(left.typedValue, right.typedValue);
          return bool(result);
        },
      )
      .invalidLexicalForm([ C.TypeAlias.SPARQL_NON_LEXICAL, C.TypeURL.XSD_STRING ], 1)
      .invalidLexicalForm([ C.TypeURL.XSD_STRING, C.TypeAlias.SPARQL_NON_LEXICAL ], 2);
  }

  public booleanTest(test: (context: ICompleteSharedContext) => (left: boolean, right: boolean) => boolean): Builder {
    return this
      .set(
        [ C.TypeURL.XSD_BOOLEAN, C.TypeURL.XSD_BOOLEAN ],
        context => ([ left, right ]: E.BooleanLiteral[]) => {
          const result = test(context)(left.typedValue, right.typedValue);
          return bool(result);
        },
      )
      .invalidLexicalForm([ C.TypeAlias.SPARQL_NON_LEXICAL, C.TypeURL.XSD_BOOLEAN ], 1)
      .invalidLexicalForm([ C.TypeURL.XSD_BOOLEAN, C.TypeAlias.SPARQL_NON_LEXICAL ], 2);
  }

  public dateTimeTest(test: (context: ICompleteSharedContext) => (left: Date, right: Date) => boolean): Builder {
    return this
      .set(
        [ C.TypeURL.XSD_DATE_TIME, C.TypeURL.XSD_DATE_TIME ],
        context => ([ left, right ]: E.DateTimeLiteral[]) => {
          const result = test(context)(left.typedValue, right.typedValue);
          return bool(result);
        },
      )
      .invalidLexicalForm([ C.TypeAlias.SPARQL_NON_LEXICAL, C.TypeURL.XSD_DATE_TIME ], 1)
      .invalidLexicalForm([ C.TypeURL.XSD_DATE_TIME, C.TypeAlias.SPARQL_NON_LEXICAL ], 2);
  }

  public numeric(op: ImplementationFunction): Builder {
    return this
      .set([ C.TypeAlias.SPARQL_NUMERIC, C.TypeAlias.SPARQL_NUMERIC ], op)
      .invalidLexicalForm([ C.TypeAlias.SPARQL_NUMERIC, C.TypeAlias.SPARQL_NON_LEXICAL ], 2)
      .invalidLexicalForm([ C.TypeAlias.SPARQL_NON_LEXICAL, C.TypeAlias.SPARQL_NUMERIC ], 1);
  }

  public invalidLexicalForm(types: ExperimentalArgumentType[], index: number): Builder {
    return this.set(types, () => (args: Term[]): E.TermExpression => {
      throw new Err.InvalidLexicalForm(args[index - 1].toRDF());
    });
  }
}

// ----------------------------------------------------------------------------
// Literal Construction helpers
// ----------------------------------------------------------------------------

export function bool(val: boolean): E.BooleanLiteral {
  return new E.BooleanLiteral(val);
}

export function integer(num: number, dt?: C.KnownLiteralTypes): E.IntegerLiteral {
  if (dt && !isInternalSubType(dt, TypeURL.XSD_INTEGER)) {
    throw new Error('apple');
  }
  return new E.IntegerLiteral(num, dt);
}

export function decimal(num: number, dt?: C.KnownLiteralTypes): E.DecimalLiteral {
  if (dt && !isInternalSubType(dt, TypeURL.XSD_DECIMAL)) {
    throw new Error('apple');
  }
  return new E.DecimalLiteral(num, dt);
}

export function float(num: number, dt?: C.KnownLiteralTypes): E.FloatLiteral {
  if (dt && !isInternalSubType(dt, TypeURL.XSD_FLOAT)) {
    throw new Error('apple');
  }
  return new E.FloatLiteral(num, dt);
}

export function double(num: number, dt?: C.KnownLiteralTypes): E.DoubleLiteral {
  if (dt && !isInternalSubType(dt, TypeURL.XSD_DOUBLE)) {
    throw new Error('apple');
  }
  return new E.DoubleLiteral(num, dt);
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
