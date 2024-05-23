/**
 * These helpers provide a (albeit inflexible) DSL for writing function
 * definitions for the SPARQL functions.
 */
import type { IDateTimeRepresentation } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import type { Literal, TermExpression, Quad, ISerializable } from '../expressions';
import * as E from '../expressions';
import { NonLexicalLiteral } from '../expressions';
import * as C from '../util/Consts';
import { TypeURL } from '../util/Consts';
import * as Err from '../util/Errors';
import type {
  ArgumentType,
  IInternalEvaluator,
  ImplementationFunction,
  ImplementationFunctionTuple,
} from './OverloadTree';
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
    return (expressionEvaluator: IInternalEvaluator) => (args: TermExpression[]) => {
      for (const [ index, arg ] of args.entries()) {
        if (arg instanceof NonLexicalLiteral) {
          throw new Err.InvalidLexicalForm(args[index].toRDF());
        }
      }
      return func(expressionEvaluator)(args);
    };
  }

  public set(
    argTypes: [],
    func: ImplementationFunctionTuple<[]>,
    addInvalidHandling?: boolean,
  ): Builder;
  public set<T1 extends TermExpression>(
    argTypes: [ArgumentType],
    func: ImplementationFunctionTuple<[T1]>,
    addInvalidHandling?: boolean,
  ): Builder;
  public set<T1 extends TermExpression, T2 extends TermExpression>(
    argTypes: [ArgumentType, ArgumentType],
    func: ImplementationFunctionTuple<[T1, T2]>,
    addInvalidHandling?: boolean,
  ): Builder;
  public set<T1 extends TermExpression, T2 extends TermExpression, T3 extends TermExpression>(
    argTypes: [ArgumentType, ArgumentType, ArgumentType],
    func: ImplementationFunctionTuple<[T1, T2, T3]>,
    addInvalidHandling?: boolean,
  ): Builder;
  public set<
    T1 extends TermExpression,
    T2 extends TermExpression,
    T3 extends TermExpression,
    T4 extends TermExpression,
  >(
    argTypes: [ArgumentType, ArgumentType, ArgumentType, ArgumentType],
    func: ImplementationFunctionTuple<[T1, T2, T3, T4]>,
    addInvalidHandling?: boolean,
  ): Builder;
  public set(argTypes: ArgumentType[], func: ImplementationFunction, addInvalidHandling?: boolean): Builder;
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

  public onUnary<T extends Term>(type: ArgumentType, op: (expressionEvaluator: IInternalEvaluator) =>
  (val: T) => Term, addInvalidHandling = true): Builder {
    return this.set([ type ], expressionEvaluator =>
      ([ val ]: [T]) => op(expressionEvaluator)(val), addInvalidHandling);
  }

  public onUnaryTyped<T extends ISerializable>(
    type: ArgumentType,
    op: (expressionEvaluator: IInternalEvaluator) => (val: T) => Term,
addInvalidHandling = true,
  ): Builder {
    return this.set([ type ], expressionEvaluator => ([ val ]: [E.Literal<T>]) =>
      op(expressionEvaluator)(val.typedValue), addInvalidHandling);
  }

  public onBinary<L extends Term, R extends Term>(
    types: [ArgumentType, ArgumentType],
    op: (expressionEvaluator: IInternalEvaluator) => (left: L, right: R) => Term,
addInvalidHandling = true,
  ):
    Builder {
    return this.set(types, expressionEvaluator =>
      ([ left, right ]: [L, R]) => op(expressionEvaluator)(left, right), addInvalidHandling);
  }

  public onBinaryTyped<L extends ISerializable, R extends ISerializable>(
    types: [ArgumentType, ArgumentType],
    op: (expressionEvaluator: IInternalEvaluator) => (left: L, right: R) => Term,
addInvalidHandling = true,
  ):
    Builder {
    return this.set(
      types,
      expressionEvaluator =>
        ([ left, right ]: [E.Literal<L>, E.Literal<R>]) => op(expressionEvaluator)(left.typedValue, right.typedValue),
      addInvalidHandling,
    );
  }

  public onTernaryTyped<A1 extends ISerializable, A2 extends ISerializable, A3 extends ISerializable>(
    types: [ArgumentType, ArgumentType, ArgumentType],
    op: (expressionEvaluator: IInternalEvaluator)
    => (a1: A1, a2: A2, a3: A3) => Term,
addInvalidHandling = true,
  ): Builder {
    return this.set(types, expressionEvaluator => ([ a1, a2, a3 ]: [E.Literal<A1>, E.Literal<A2>, E.Literal<A3>]) =>
      op(expressionEvaluator)(a1.typedValue, a2.typedValue, a3.typedValue), addInvalidHandling);
  }

  public onTernary<A1 extends Term, A2 extends Term, A3 extends Term>(
    types: [ArgumentType, ArgumentType, ArgumentType],
    op: (expressionEvaluator: IInternalEvaluator) =>
    (a1: A1, a2: A2, a3: A3) => Term,
addInvalidHandling = true,
  ): Builder {
    return this.set(types, expressionEvaluator =>
      ([ a1, a2, a3 ]: [A1, A2, A3]) => op(expressionEvaluator)(a1, a2, a3), addInvalidHandling);
  }

  public onQuaternaryTyped<
    A1 extends ISerializable,
A2 extends ISerializable,
A3 extends ISerializable,
A4 extends ISerializable,
>(
    types: [ArgumentType, ArgumentType, ArgumentType, ArgumentType],
    op: (expressionEvaluator: IInternalEvaluator) => (a1: A1, a2: A2, a3: A3, a4: A4) => Term,
addInvalidHandling = true,
  ): Builder {
    return this.set(types, expressionEvaluator =>
      ([ a1, a2, a3, a4 ]: [E.Literal<A1>, E.Literal<A2>, E.Literal<A3>, E.Literal<A4>]) =>
        op(expressionEvaluator)(a1.typedValue, a2.typedValue, a3.typedValue, a4.typedValue), addInvalidHandling);
  }

  public onTerm1<T extends Term>(
    op: (expressionEvaluator: IInternalEvaluator) =>
    (term: T) => Term,
addInvalidHandling = false,
  ): Builder {
    return this.set(
      [ 'term' ],
      expressionEvaluator => ([ term ]: [T]) => op(expressionEvaluator)(term),
      addInvalidHandling,
    );
  }

  public onTerm3(op: (expressionEvaluator: IInternalEvaluator) => (t1: Term, t2: Term, t3: Term) => Term):
  Builder {
    return this.set(
      [ 'term', 'term', 'term' ],
      expressionEvaluator => ([ t1, t2, t3 ]: [Term, Term, Term]) => op(expressionEvaluator)(t1, t2, t3),
    );
  }

  public onQuad1(op: (expressionEvaluator: IInternalEvaluator) => (term: Term & Quad) => Term): Builder {
    return this.set([ 'quad' ], expressionEvaluator => ([ term ]: [Term & Quad]) => op(expressionEvaluator)(term));
  }

  public onLiteral1<T extends ISerializable>(
    op: (expressionEvaluator: IInternalEvaluator) =>
    (lit: E.Literal<T>) => Term,
addInvalidHandling = true,
  ): Builder {
    return this.set(
      [ 'literal' ],
      expressionEvaluator => ([ term ]: [E.Literal<T>]) => op(expressionEvaluator)(term),
      addInvalidHandling,
    );
  }

  public onBoolean1(
    op: (expressionEvaluator: IInternalEvaluator) => (lit: E.BooleanLiteral) => Term,
addInvalidHandling = true,
  ): Builder {
    return this.set(
      [ C.TypeURL.XSD_BOOLEAN ],
      expressionEvaluator => ([ lit ]: [E.BooleanLiteral]) => op(expressionEvaluator)(lit),
      addInvalidHandling,
    );
  }

  public onBoolean1Typed(
    op: (expressionEvaluator: IInternalEvaluator) => (lit: boolean) => Term,
addInvalidHandling = true,
  ): Builder {
    return this.set(
      [ C.TypeURL.XSD_BOOLEAN ],
      expressionEvaluator => ([ lit ]: [E.BooleanLiteral]) => op(expressionEvaluator)(lit.typedValue),
      addInvalidHandling,
    );
  }

  public onString1(
    op: (expressionEvaluator: IInternalEvaluator) => (lit: E.Literal<string>) => Term,
addInvalidHandling = true,
  ): Builder {
    return this.set(
      [ C.TypeURL.XSD_STRING ],
      expressionEvaluator => ([ lit ]: [E.Literal<string>]) => op(expressionEvaluator)(lit),
      addInvalidHandling,
    );
  }

  public onString1Typed(
    op: (expressionEvaluator: IInternalEvaluator) => (lit: string) => Term,
addInvalidHandling = true,
  ): Builder {
    return this.set(
      [ C.TypeURL.XSD_STRING ],
      expressionEvaluator => ([ lit ]: [E.Literal<string>]) => op(expressionEvaluator)(lit.typedValue),
      addInvalidHandling,
    );
  }

  public onLangString1(
    op: (expressionEvaluator: IInternalEvaluator) => (lit: E.LangStringLiteral) => Term,
addInvalidHandling = true,
  ): Builder {
    return this.set(
      [ C.TypeURL.RDF_LANG_STRING ],
      expressionEvaluator => ([ lit ]: [E.LangStringLiteral]) => op(expressionEvaluator)(lit),
      addInvalidHandling,
    );
  }

  public onStringly1(
    op: (expressionEvaluator: IInternalEvaluator) => (lit: E.Literal<string>) => Term,
addInvalidHandling = true,
  ): Builder {
    return this.set(
      [ C.TypeAlias.SPARQL_STRINGLY ],
      expressionEvaluator => ([ lit ]: [E.Literal<string>]) => op(expressionEvaluator)(lit),
      addInvalidHandling,
    );
  }

  public onStringly1Typed(
    op: (expressionEvaluator: IInternalEvaluator) => (lit: string) => Term,
addInvalidHandling = true,
  ): Builder {
    return this.set(
      [ C.TypeAlias.SPARQL_STRINGLY ],
      expressionEvaluator => ([ lit ]: [E.Literal<string>]) => op(expressionEvaluator)(lit.typedValue),
      addInvalidHandling,
    );
  }

  public onNumeric1(
    op: (expressionEvaluator: IInternalEvaluator) => (val: E.NumericLiteral) => Term,
addInvalidHandling = true,
  ): Builder {
    return this.set(
      [ C.TypeAlias.SPARQL_NUMERIC ],
      expressionEvaluator => ([ val ]: [E.NumericLiteral]) => op(expressionEvaluator)(val),
      addInvalidHandling,
    );
  }

  public onDateTime1(
    op: (expressionEvaluator: IInternalEvaluator) => (date: E.DateTimeLiteral) => Term,
addInvalidHandling = true,
  ): Builder {
    return this
      .set(
        [ C.TypeURL.XSD_DATE_TIME ],
        expressionEvaluator => ([ val ]: [E.DateTimeLiteral]) => op(expressionEvaluator)(val),
        addInvalidHandling,
      );
  }

  /**
   * We return the base types and not the provided types because we don't want to create invalid terms.
   * Providing negative number to a function unary - for example should not
   * return a term of type negative number having a positive value.
   * @param op the numeric operator performed
   * @param addInvalidHandling whether to add invalid handling,
   *   whether to add @param op in @see wrapInvalidLexicalProtected
   */
  public numericConverter(
    op: (expressionEvaluator: IInternalEvaluator) => (val: number) => number,
addInvalidHandling = true,
  ): Builder {
    const evalHelper = (expressionEvaluator: IInternalEvaluator) => (arg: Term): number =>
      op(expressionEvaluator)((<Literal<number>>arg).typedValue);
    return this.onUnary(TypeURL.XSD_INTEGER, expressionEvaluator => arg =>
      integer(evalHelper(expressionEvaluator)(arg)), addInvalidHandling)
      .onUnary(TypeURL.XSD_DECIMAL, expressionEvaluator => arg =>
        decimal(evalHelper(expressionEvaluator)(arg)), addInvalidHandling)
      .onUnary(TypeURL.XSD_FLOAT, expressionEvaluator => arg =>
        float(evalHelper(expressionEvaluator)(arg)), addInvalidHandling)
      .onUnary(TypeURL.XSD_DOUBLE, expressionEvaluator => arg =>
        double(evalHelper(expressionEvaluator)(arg)), addInvalidHandling);
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
  public arithmetic(
    op: (expressionEvaluator: IInternalEvaluator) => (left: number, right: number) => number,
addInvalidHandling = true,
  ): Builder {
    const evalHelper = (expressionEvaluator: IInternalEvaluator) => (left: Term, right: Term): number =>
      op(expressionEvaluator)((<Literal<number>>left).typedValue, (<Literal<number>>right).typedValue);
    return this.onBinary([ TypeURL.XSD_INTEGER, TypeURL.XSD_INTEGER ], expressionEvaluator => (left, right) =>
      integer(evalHelper(expressionEvaluator)(left, right)), addInvalidHandling)
      .onBinary([ TypeURL.XSD_DECIMAL, TypeURL.XSD_DECIMAL ], expressionEvaluator => (left, right) =>
        decimal(evalHelper(expressionEvaluator)(left, right)), addInvalidHandling)
      .onBinary([ TypeURL.XSD_FLOAT, TypeURL.XSD_FLOAT ], expressionEvaluator => (left, right) =>
        float(evalHelper(expressionEvaluator)(left, right)), addInvalidHandling)
      .onBinary([ TypeURL.XSD_DOUBLE, TypeURL.XSD_DOUBLE ], expressionEvaluator => (left, right) =>
        double(evalHelper(expressionEvaluator)(left, right)), addInvalidHandling);
  }

  public numberTest(
    test: (expressionEvaluator: IInternalEvaluator) => (left: number, right: number) => boolean,
  ): Builder {
    return this.numeric(expressionEvaluator => ([ left, right ]: E.NumericLiteral[]) => {
      const result = test(expressionEvaluator)(left.typedValue, right.typedValue);
      return bool(result);
    });
  }

  public stringTest(
    test: (expressionEvaluator: IInternalEvaluator) => (left: string, right: string) => boolean,
addInvalidHandling = true,
  ): Builder {
    return this
      .set(
        [ C.TypeURL.XSD_STRING, C.TypeURL.XSD_STRING ],
        expressionEvaluator => ([ left, right ]: E.StringLiteral[]) => {
          const result = test(expressionEvaluator)(left.typedValue, right.typedValue);
          return bool(result);
        },
        addInvalidHandling,
      );
  }

  public booleanTest(
    test: (expressionEvaluator: IInternalEvaluator) => (left: boolean, right: boolean) => boolean,
addInvalidHandling = true,
  ): Builder {
    return this
      .set(
        [ C.TypeURL.XSD_BOOLEAN, C.TypeURL.XSD_BOOLEAN ],
        expressionEvaluator => ([ left, right ]: E.BooleanLiteral[]) => {
          const result = test(expressionEvaluator)(left.typedValue, right.typedValue);
          return bool(result);
        },
        addInvalidHandling,
      );
  }

  public dateTimeTest(test: (expressionEvaluator: IInternalEvaluator)
  => (left: IDateTimeRepresentation, right: IDateTimeRepresentation) => boolean, addInvalidHandling = true): Builder {
    return this
      .set(
        [ C.TypeURL.XSD_DATE_TIME, C.TypeURL.XSD_DATE_TIME ],
        expressionEvaluator => ([ left, right ]: E.DateTimeLiteral[]) => {
          const result = test(expressionEvaluator)(left.typedValue, right.typedValue);
          return bool(result);
        },
        addInvalidHandling,
      );
  }

  public numeric<T extends TermExpression>(op: ImplementationFunctionTuple<[T, T]>): Builder {
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
