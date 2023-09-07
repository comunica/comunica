/**
 * These helpers provide a (albeit inflexible) DSL for writing function
 * definitions for the SPARQL functions.
 */
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import type { ICompleteSharedContext } from '../evaluators/evaluatorHelpers/BaseExpressionEvaluator';
import type { Literal, TermExpression, Quad, ISerializable } from '../expressions';
import * as E from '../expressions';
import { NonLexicalLiteral } from '../expressions';
import * as C from '../util/Consts';
import { TypeURL } from '../util/Consts';
import type { IDateTimeRepresentation } from '../util/DateTimeHelpers';
import * as Err from '../util/Errors';
import type { ArgumentType } from './Core';
import type { ImplementationFunction } from './OverloadTree';
import { OverloadTree } from './OverloadTree';

type Term = E.TermExpression;

const DF = new DataFactory();

export function declare(identifier: string): Builder {
  return new Builder(identifier);
}

export class Builder {
  private readonly overloadTree: OverloadTree;
  private collected: boolean;

  public constructor(identifier: string) {
    this.overloadTree = new OverloadTree(identifier);
    this.collected = false;
  }

  public collect(): OverloadTree {
    if (this.collected) {
      // Only 1 time allowed because we can't copy a tree. (And we don't need this).
      throw new Error('Builders can only be collected once!');
    }
    this.collected = true;
    return this.overloadTree;
  }

  private static wrapInvalidLexicalProtected(func: ImplementationFunction): ImplementationFunction {
    return (context: ICompleteSharedContext) => (args: TermExpression[]) => {
      args.forEach((arg, index) => {
        if (arg instanceof NonLexicalLiteral) {
          throw new Err.InvalidLexicalForm(args[index].toRDF());
        }
      });
      return func(context)(args);
    };
  }

  public set(argTypes: ArgumentType[], func: ImplementationFunction, addInvalidHandling = true): Builder {
    this.overloadTree.addOverload(argTypes, addInvalidHandling ? Builder.wrapInvalidLexicalProtected(func) : func);
    return this;
  }

  public copy({ from, to }: { from: ArgumentType[]; to: ArgumentType[] }): Builder {
    const impl = this.overloadTree.getImplementationExact(from);
    if (!impl) {
      throw new Err.UnexpectedError(
        'Tried to copy implementation, but types not found',
        { from, to },
      );
    }
    return this.set(to, impl);
  }

  public onUnary<T extends Term>(type: ArgumentType, op: (context: ICompleteSharedContext) =>
  (val: T) => Term, addInvalidHandling = true): Builder {
    return this.set([ type ], context => ([ val ]: [T]) => op(context)(val), addInvalidHandling);
  }

  public onUnaryTyped<T extends ISerializable>(type: ArgumentType,
    op: (context: ICompleteSharedContext) => (val: T) => Term, addInvalidHandling = true): Builder {
    return this.set([ type ], context => ([ val ]: [E.Literal<T>]) => op(context)(val.typedValue), addInvalidHandling);
  }

  public onBinary<L extends Term, R extends Term>(types: ArgumentType[],
    op: (context: ICompleteSharedContext) => (left: L, right: R) => Term, addInvalidHandling = true): Builder {
    return this.set(types, context => ([ left, right ]: [L, R]) => op(context)(left, right), addInvalidHandling);
  }

  public onBinaryTyped<L extends ISerializable, R extends ISerializable>(types: ArgumentType[],
    op: (context: ICompleteSharedContext) => (left: L, right: R) => Term, addInvalidHandling = true): Builder {
    return this.set(types,
      context => ([ left, right ]: [E.Literal<L>, E.Literal<R>]) => op(context)(left.typedValue, right.typedValue),
      addInvalidHandling);
  }

  public onTernaryTyped<A1 extends ISerializable, A2 extends ISerializable, A3 extends ISerializable>(
    types: ArgumentType[], op: (context: ICompleteSharedContext)
    => (a1: A1, a2: A2, a3: A3) => Term, addInvalidHandling = true,
  ): Builder {
    return this.set(types, context => ([ a1, a2, a3 ]: [E.Literal<A1>, E.Literal<A2>, E.Literal<A3>]) =>
      op(context)(a1.typedValue, a2.typedValue, a3.typedValue), addInvalidHandling);
  }

  public onTernary<A1 extends Term, A2 extends Term, A3 extends Term>(types: ArgumentType[],
    op: (context: ICompleteSharedContext) => (a1: A1, a2: A2, a3: A3) => Term, addInvalidHandling = true): Builder {
    return this.set(types, context => ([ a1, a2, a3 ]: [A1, A2, A3]) => op(context)(a1, a2, a3), addInvalidHandling);
  }

  public onQuaternaryTyped<A1 extends ISerializable, A2 extends ISerializable,
    A3 extends ISerializable, A4 extends ISerializable>(types: ArgumentType[],
    op: (context: ICompleteSharedContext) => (a1: A1, a2: A2, a3: A3, a4: A4) => Term,
    addInvalidHandling = true): Builder {
    return this.set(types, context =>
      ([ a1, a2, a3, a4 ]: [E.Literal<A1>, E.Literal<A2>, E.Literal<A3>, E.Literal<A4>]) =>
        op(context)(a1.typedValue, a2.typedValue, a3.typedValue, a4.typedValue), addInvalidHandling);
  }

  public onTerm1(op: (context: ICompleteSharedContext) => (term: Term) => Term, addInvalidHandling = false): Builder {
    return this.set(
      [ 'term' ],
      context => ([ term ]: [Term]) => op(context)(term),
      addInvalidHandling,
    );
  }

  public onTerm3(op: (context: ICompleteSharedContext) => (t1: Term, t2: Term, t3: Term) => Term): Builder {
    return this.set([ 'term', 'term', 'term' ],
      context => ([ t1, t2, t3 ]: [Term, Term, Term]) => op(context)(t1, t2, t3));
  }

  public onQuad1(op: (context: ICompleteSharedContext) => (term: Term & Quad) => Term): Builder {
    return this.set([ 'quad' ], context => ([ term ]: [Term & Quad]) => op(context)(term));
  }

  public onLiteral1<T extends ISerializable>(op: (context: ICompleteSharedContext) => (lit: E.Literal<T>) => Term,
    addInvalidHandling = true): Builder {
    return this.set(
      [ 'literal' ],
      context => ([ term ]: [E.Literal<T>]) => op(context)(term),
      addInvalidHandling,
    );
  }

  public onBoolean1(op: (context: ICompleteSharedContext) => (lit: E.BooleanLiteral) => Term,
    addInvalidHandling = true): Builder {
    return this.set(
      [ C.TypeURL.XSD_BOOLEAN ],
      context => ([ lit ]: [E.BooleanLiteral]) => op(context)(lit),
      addInvalidHandling,
    );
  }

  public onBoolean1Typed(op: (context: ICompleteSharedContext) => (lit: boolean) => Term,
    addInvalidHandling = true): Builder {
    return this.set(
      [ C.TypeURL.XSD_BOOLEAN ],
      context => ([ lit ]: [E.BooleanLiteral]) => op(context)(lit.typedValue),
      addInvalidHandling,
    );
  }

  public onString1(op: (context: ICompleteSharedContext) => (lit: E.Literal<string>) => Term,
    addInvalidHandling = true): Builder {
    return this.set(
      [ C.TypeURL.XSD_STRING ],
      context => ([ lit ]: [E.Literal<string>]) => op(context)(lit),
      addInvalidHandling,
    );
  }

  public onString1Typed(op: (context: ICompleteSharedContext) => (lit: string) => Term,
    addInvalidHandling = true): Builder {
    return this.set(
      [ C.TypeURL.XSD_STRING ],
      context => ([ lit ]: [E.Literal<string>]) => op(context)(lit.typedValue),
      addInvalidHandling,
    );
  }

  public onLangString1(op: (context: ICompleteSharedContext) => (lit: E.LangStringLiteral) => Term,
    addInvalidHandling = true): Builder {
    return this.set(
      [ C.TypeURL.RDF_LANG_STRING ],
      context => ([ lit ]: [E.LangStringLiteral]) => op(context)(lit),
      addInvalidHandling,
    );
  }

  public onStringly1(op: (context: ICompleteSharedContext) => (lit: E.Literal<string>) => Term,
    addInvalidHandling = true): Builder {
    return this.set(
      [ C.TypeAlias.SPARQL_STRINGLY ],
      context => ([ lit ]: [E.Literal<string>]) => op(context)(lit),
      addInvalidHandling,
    );
  }

  public onStringly1Typed(op: (context: ICompleteSharedContext) => (lit: string) => Term,
    addInvalidHandling = true): Builder {
    return this.set(
      [ C.TypeAlias.SPARQL_STRINGLY ],
      context => ([ lit ]: [E.Literal<string>]) => op(context)(lit.typedValue),
      addInvalidHandling,
    );
  }

  public onNumeric1(op: (context: ICompleteSharedContext) => (val: E.NumericLiteral) => Term,
    addInvalidHandling = true): Builder {
    return this.set(
      [ C.TypeAlias.SPARQL_NUMERIC ],
      context => ([ val ]: [E.NumericLiteral]) => op(context)(val),
      addInvalidHandling,
    );
  }

  public onDateTime1(op: (context: ICompleteSharedContext) => (date: E.DateTimeLiteral) => Term,
    addInvalidHandling = true): Builder {
    return this
      .set([ C.TypeURL.XSD_DATE_TIME ],
        context => ([ val ]: [E.DateTimeLiteral]) => op(context)(val),
        addInvalidHandling);
  }

  /**
   * We return the base types and not the provided types because we don't want to create invalid terms.
   * Providing negative number to a function unary - for example should not
   * return a term of type negative number having a positive value.
   * @param op the numeric operator performed
   * @param addInvalidHandling whether to add invalid handling,
   *   whether to add @param op in @see wrapInvalidLexicalProtected
   */
  public numericConverter(op: (context: ICompleteSharedContext) => (val: number) => number,
    addInvalidHandling = true): Builder {
    const evalHelper = (context: ICompleteSharedContext) => (arg: Term): number =>
      op(context)((<Literal<number>>arg).typedValue);
    return this.onBinary([ TypeURL.XSD_INTEGER ], context => arg =>
      integer(evalHelper(context)(arg)), addInvalidHandling)
      .onBinary([ TypeURL.XSD_DECIMAL ], context => arg =>
        decimal(evalHelper(context)(arg)), addInvalidHandling)
      .onBinary([ TypeURL.XSD_FLOAT ], context => arg =>
        float(evalHelper(context)(arg)), addInvalidHandling)
      .onBinary([ TypeURL.XSD_DOUBLE ], context => arg =>
        double(evalHelper(context)(arg)), addInvalidHandling);
  }

  /**
   * !!! Be aware when using this function, it will create different overloads with different return types !!!
   * Arithmetic operators take 2 numeric arguments, and return a single numerical
   * value. The type of the return value is heavily dependent on the types of the
   * input arguments. In JS everything is a double, but in SPARQL it is not.
   *
   * The different arguments are handled by type promotion and subtype substitution.
   * The way numeric function arguments work is described here:
   * https://www.w3.org/TR/xpath20/#mapping
   * Above url is referenced in the sparql spec: https://www.w3.org/TR/sparql11-query/#OperatorMapping
   */
  public arithmetic(op: (context: ICompleteSharedContext) => (left: number, right: number) => number,
    addInvalidHandling = true): Builder {
    const evalHelper = (context: ICompleteSharedContext) => (left: Term, right: Term): number =>
      op(context)((<Literal<number>>left).typedValue, (<Literal<number>>right).typedValue);
    return this.onBinary([ TypeURL.XSD_INTEGER, TypeURL.XSD_INTEGER ], context => (left, right) =>
      integer(evalHelper(context)(left, right)), addInvalidHandling)
      .onBinary([ TypeURL.XSD_DECIMAL, TypeURL.XSD_DECIMAL ], context => (left, right) =>
        decimal(evalHelper(context)(left, right)), addInvalidHandling)
      .onBinary([ TypeURL.XSD_FLOAT, TypeURL.XSD_FLOAT ], context => (left, right) =>
        float(evalHelper(context)(left, right)), addInvalidHandling)
      .onBinary([ TypeURL.XSD_DOUBLE, TypeURL.XSD_DOUBLE ], context => (left, right) =>
        double(evalHelper(context)(left, right)), addInvalidHandling);
  }

  public numberTest(test: (context: ICompleteSharedContext) => (left: number, right: number) => boolean): Builder {
    return this.numeric(context => ([ left, right ]: E.NumericLiteral[]) => {
      const result = test(context)(left.typedValue, right.typedValue);
      return bool(result);
    });
  }

  public stringTest(test: (context: ICompleteSharedContext) => (left: string, right: string) => boolean,
    addInvalidHandling = true): Builder {
    return this
      .set(
        [ C.TypeURL.XSD_STRING, C.TypeURL.XSD_STRING ],
        context => ([ left, right ]: E.StringLiteral[]) => {
          const result = test(context)(left.typedValue, right.typedValue);
          return bool(result);
        },
        addInvalidHandling,
      );
  }

  public booleanTest(test: (context: ICompleteSharedContext) => (left: boolean, right: boolean) => boolean,
    addInvalidHandling = true): Builder {
    return this
      .set(
        [ C.TypeURL.XSD_BOOLEAN, C.TypeURL.XSD_BOOLEAN ],
        context => ([ left, right ]: E.BooleanLiteral[]) => {
          const result = test(context)(left.typedValue, right.typedValue);
          return bool(result);
        },
        addInvalidHandling,
      );
  }

  public dateTimeTest(test: (context: ICompleteSharedContext)
  => (left: IDateTimeRepresentation, right: IDateTimeRepresentation) => boolean, addInvalidHandling = true): Builder {
    return this
      .set(
        [ C.TypeURL.XSD_DATE_TIME, C.TypeURL.XSD_DATE_TIME ],
        context => ([ left, right ]: E.DateTimeLiteral[]) => {
          const result = test(context)(left.typedValue, right.typedValue);
          return bool(result);
        },
        addInvalidHandling,
      );
  }

  public numeric(op: ImplementationFunction): Builder {
    return this.set([ C.TypeAlias.SPARQL_NUMERIC, C.TypeAlias.SPARQL_NUMERIC ], op);
  }
}

// ----------------------------------------------------------------------------
// Literal Construction helpers
// ----------------------------------------------------------------------------

export function bool(val: boolean): E.BooleanLiteral {
  return new E.BooleanLiteral(val);
}

export function integer(num: number): E.IntegerLiteral {
  return new E.IntegerLiteral(num);
}

export function decimal(num: number): E.DecimalLiteral {
  return new E.DecimalLiteral(num);
}

export function float(num: number): E.FloatLiteral {
  return new E.FloatLiteral(num);
}

export function double(num: number): E.DoubleLiteral {
  return new E.DoubleLiteral(num);
}

export function string(str: string): E.StringLiteral {
  return new E.StringLiteral(str);
}

export function langString(str: string, lang: string): E.LangStringLiteral {
  return new E.LangStringLiteral(str, lang);
}

export function dateTime(date: IDateTimeRepresentation, str: string): E.DateTimeLiteral {
  return new E.DateTimeLiteral(date, str);
}

export function expressionToVar(variableExpression: E.VariableExpression): RDF.Variable {
  return DF.variable(variableExpression.name.slice(1));
}
