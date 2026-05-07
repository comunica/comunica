/**
 * These helpers provide a (albeit inflexible) DSL for writing function
 * definitions for the SPARQL functions.
 */
import { KeysInitQuery } from '@comunica/context-entries';
import type {
  ComunicaDataFactory,
  IDateTimeRepresentation,
  IInternalEvaluator,
  ImplementationFunction,
  ImplementationFunctionTuple,
  TermExpression,
  VariableExpression,
} from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { ISerializable, Literal, Quad } from '../expressions';
import * as E from '../expressions';
import { NonLexicalLiteral } from '../expressions';
import * as C from '../util/Consts';
import { TypeURL } from '../util/Consts';
import * as Err from '../util/Errors';
import { IncompatibleLanguageOperation } from '../util/Errors';
import type {
  ArgumentType,
} from './OverloadTree';
import { OverloadTree } from './OverloadTree';

type Term = TermExpression;

/**
 * Creates a new function overload builder for the given SPARQL function identifier.
 * @param identifier The name of the SPARQL function to declare.
 * @return A new Builder instance for registering overloads.
 */
export function declare(identifier: string): Builder {
  return new Builder(identifier);
}

/**
 * DSL builder for declaring SPARQL function overloads with type-safe argument handling.
 */
export class Builder {
  private readonly overloadTree: OverloadTree;
  private collected: boolean;

  /**
   * Creates a new Builder.
   * @param identifier The name of the SPARQL function being built.
   */
  public constructor(identifier: string) {
    this.overloadTree = new OverloadTree(identifier);
    this.collected = false;
  }

  /**
   * Finalizes the builder and returns the constructed overload tree. Can only be called once.
   * @return The completed overload tree.
   */
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
          throw new Err.InvalidLexicalForm(
            args[index].toRDF(expressionEvaluator.context.getSafe(KeysInitQuery.dataFactory)),
          );
        }
      }
      return func(expressionEvaluator)(args);
    };
  }

  /**
   * Registers a function overload for the given argument types.
   * @param argTypes The expected argument types.
   * @param func The implementation function.
   * @param addInvalidHandling Whether to wrap with non-lexical literal protection.
   */
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

  /**
   * Copies an existing overload implementation from one type signature to another.
   */
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

  /**
   * Registers a unary operator overload that receives the full term expression.
   * @param type The expected argument type.
   * @param op The unary operation.
   * @param addInvalidHandling Whether to add non-lexical literal protection.
   */
  public onUnary<T extends Term>(type: ArgumentType, op: (expressionEvaluator: IInternalEvaluator) =>
  (val: T) => Term, addInvalidHandling = true): Builder {
    return this.set([ type ], expressionEvaluator =>
      ([ val ]: [T]) => op(expressionEvaluator)(val), addInvalidHandling);
  }

  /**
   * Registers a unary operator overload that receives the literal's typed value.
   * @param type The expected argument type.
   * @param op The unary operation on the typed value.
   * @param addInvalidHandling Whether to add non-lexical literal protection.
   */
  public onUnaryTyped<T extends ISerializable>(
    type: ArgumentType,
    op: (expressionEvaluator: IInternalEvaluator) => (val: T) => Term,
addInvalidHandling = true,
  ): Builder {
    return this.set([ type ], expressionEvaluator => ([ val ]: [E.Literal<T>]) =>
      op(expressionEvaluator)(val.typedValue), addInvalidHandling);
  }

  /**
   * Registers a binary operator overload that receives full term expressions.
   * @param types The expected argument types as a pair.
   * @param op The binary operation.
   * @param addInvalidHandling Whether to add non-lexical literal protection.
   */
  public onBinary<L extends Term, R extends Term>(
    types: [ArgumentType, ArgumentType],
    op: (expressionEvaluator: IInternalEvaluator) => (left: L, right: R) => Term,
addInvalidHandling = true,
  ):
    Builder {
    return this.set(types, expressionEvaluator =>
      ([ left, right ]: [L, R]) => op(expressionEvaluator)(left, right), addInvalidHandling);
  }

  /**
   * Registers a binary operator overload that receives literal typed values.
   * @param types The expected argument types as a pair.
   * @param op The binary operation on typed values.
   * @param addInvalidHandling Whether to add non-lexical literal protection.
   */
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

  /**
   * Registers a ternary operator overload that receives literal typed values.
   * @param types The expected argument types as a triple.
   * @param op The ternary operation on typed values.
   * @param addInvalidHandling Whether to add non-lexical literal protection.
   */
  public onTernaryTyped<A1 extends ISerializable, A2 extends ISerializable, A3 extends ISerializable>(
    types: [ArgumentType, ArgumentType, ArgumentType],
    op: (expressionEvaluator: IInternalEvaluator)
    => (a1: A1, a2: A2, a3: A3) => Term,
addInvalidHandling = true,
  ): Builder {
    return this.set(types, expressionEvaluator => ([ a1, a2, a3 ]: [E.Literal<A1>, E.Literal<A2>, E.Literal<A3>]) =>
      op(expressionEvaluator)(a1.typedValue, a2.typedValue, a3.typedValue), addInvalidHandling);
  }

  /**
   * Registers a ternary operator overload that receives full term expressions.
   * @param types The expected argument types as a triple.
   * @param op The ternary operation.
   * @param addInvalidHandling Whether to add non-lexical literal protection.
   */
  public onTernary<A1 extends Term, A2 extends Term, A3 extends Term>(
    types: [ArgumentType, ArgumentType, ArgumentType],
    op: (expressionEvaluator: IInternalEvaluator) =>
    (a1: A1, a2: A2, a3: A3) => Term,
addInvalidHandling = true,
  ): Builder {
    return this.set(types, expressionEvaluator =>
      ([ a1, a2, a3 ]: [A1, A2, A3]) => op(expressionEvaluator)(a1, a2, a3), addInvalidHandling);
  }

  /**
   * Registers a quaternary operator overload that receives literal typed values.
   * @param types The expected argument types as a quadruple.
   * @param op The quaternary operation on typed values.
   * @param addInvalidHandling Whether to add non-lexical literal protection.
   */
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

  /**
   * Registers a unary overload that accepts any term type.
   * @param op The unary operation on any term.
   * @param addInvalidHandling Whether to add non-lexical literal protection.
   */
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

  /**
   * Registers a ternary overload that accepts any term types.
   * @param op The ternary operation on any terms.
   */
  public onTerm3(op: (expressionEvaluator: IInternalEvaluator) => (t1: Term, t2: Term, t3: Term) => Term):
  Builder {
    return this.set(
      [ 'term', 'term', 'term' ],
      expressionEvaluator => ([ t1, t2, t3 ]: [Term, Term, Term]) => op(expressionEvaluator)(t1, t2, t3),
    );
  }

  /**
   * Registers a unary overload that accepts a quad term.
   * @param op The unary operation on a quad.
   */
  public onQuad1(op: (expressionEvaluator: IInternalEvaluator) => (term: Term & Quad) => Term): Builder {
    return this.set([ 'quad' ], expressionEvaluator => ([ term ]: [Term & Quad]) => op(expressionEvaluator)(term));
  }

  /**
   * Registers a unary overload that accepts any literal.
   * @param op The unary operation on a literal.
   * @param addInvalidHandling Whether to add non-lexical literal protection.
   */
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

  /**
   * Registers a unary overload that accepts a boolean literal.
   * @param op The unary operation on a boolean literal.
   * @param addInvalidHandling Whether to add non-lexical literal protection.
   */
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

  /**
   * Registers a unary overload that receives a boolean typed value.
   * @param op The unary operation on a boolean value.
   * @param addInvalidHandling Whether to add non-lexical literal protection.
   */
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

  /**
   * Registers a unary overload that accepts a string literal.
   * @param op The unary operation on a string literal.
   * @param addInvalidHandling Whether to add non-lexical literal protection.
   */
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

  /**
   * Registers a unary overload that receives a string typed value.
   * @param op The unary operation on a string value.
   * @param addInvalidHandling Whether to add non-lexical literal protection.
   */
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

  /**
   * Registers a unary overload that accepts a language-tagged string literal.
   * @param op The unary operation on a language-tagged string literal.
   * @param addInvalidHandling Whether to add non-lexical literal protection.
   */
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

  /**
   * Registers a unary overload that accepts a directional language-tagged string literal.
   * @param op The unary operation on a directional language-tagged string literal.
   * @param addInvalidHandling Whether to add non-lexical literal protection.
   */
  public onDirLangString1(
    op: (expressionEvaluator: IInternalEvaluator) => (lit: E.DirLangStringLiteral) => Term,
    addInvalidHandling = true,
  ): Builder {
    return this.set(
      [ C.TypeURL.RDF_DIR_LANG_STRING ],
      expressionEvaluator => ([ lit ]: [E.DirLangStringLiteral]) => op(expressionEvaluator)(lit),
      addInvalidHandling,
    );
  }

  /**
   * Registers a unary overload that accepts a SPARQL stringly typed literal.
   * @param op The unary operation on a stringly literal.
   * @param addInvalidHandling Whether to add non-lexical literal protection.
   */
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

  /**
   * Registers a unary overload that receives a SPARQL stringly typed value.
   * @param op The unary operation on the string value.
   * @param addInvalidHandling Whether to add non-lexical literal protection.
   */
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

  /**
   * https://www.w3.org/TR/sparql12-query/#dfn-argument-compatible
   */
  public verifyCompatibility(
    litA: E.Literal<string> | E.LangStringLiteral | E.DirLangStringLiteral,
    litB: E.Literal<string> | E.LangStringLiteral | E.DirLangStringLiteral,
  ): void {
    // The fact that it is stringly means that it is either xsd:string or a subType, or it is langDirStr or LanStr
    const typeA = litA.dataType;
    const typeB = litB.dataType;
    if (typeA === TypeURL.RDF_DIR_LANG_STRING) {
      if (typeB === TypeURL.RDF_LANG_STRING) {
        throw new IncompatibleLanguageOperation(litA, litB);
      }
      if (typeB === TypeURL.RDF_DIR_LANG_STRING &&
          !(litA.language === litB.language && litA.direction === litB.direction)) {
        throw new IncompatibleLanguageOperation(litA, litB);
      }
    } else if (typeA === TypeURL.RDF_LANG_STRING) {
      if (typeB === TypeURL.RDF_DIR_LANG_STRING) {
        throw new IncompatibleLanguageOperation(litA, litB);
      }
      if (typeB === TypeURL.RDF_LANG_STRING && litA.language !== litB.language) {
        throw new IncompatibleLanguageOperation(litA, litB);
      }
    }
    // We now know A is an xsd:string derived
    if (typeA === TypeURL.XSD_STRING && (typeB === TypeURL.RDF_DIR_LANG_STRING || typeB === TypeURL.RDF_LANG_STRING)) {
      throw new IncompatibleLanguageOperation(litA, litB);
    }
  }

  /**
   * Registers a binary overload for compatible stringly literals with language/direction validation.
   * @param op The binary operation on compatible string literals.
   * @param addInvalidHandling Whether to add non-lexical literal protection.
   */
  public onCompatibleStringly2(
    op: (expressionEvaluator: IInternalEvaluator) => (litA: E.Literal<string>, litB: E.Literal<string>) => Term,
    addInvalidHandling = true,
  ): Builder {
    return this.set(
      [ C.TypeAlias.SPARQL_STRINGLY, C.TypeAlias.SPARQL_STRINGLY ],
      expressionEvaluator => ([ litA, litB ]: [
          E.Literal<string> | E.LangStringLiteral | E.DirLangStringLiteral,
          E.Literal<string> | E.LangStringLiteral | E.DirLangStringLiteral,
      ]) => {
        this.verifyCompatibility(litA, litB);
        return op(expressionEvaluator)(litA, litB);
      },
      addInvalidHandling,
    );
  }

  /**
   * Registers a binary overload for compatible stringly typed values with language/direction validation.
   * @param op The binary operation on compatible string values.
   * @param addInvalidHandling Whether to add non-lexical literal protection.
   */
  public onCompatibleStringly2Typed(
    op: (expressionEvaluator: IInternalEvaluator) => (litA: string, litB: string) => Term,
    addInvalidHandling = true,
  ): Builder {
    return this.set(
      [ C.TypeAlias.SPARQL_STRINGLY, C.TypeAlias.SPARQL_STRINGLY ],
      expressionEvaluator => ([ litA, litB ]: [
        E.Literal<string> | E.LangStringLiteral | E.DirLangStringLiteral,
        E.Literal<string> | E.LangStringLiteral | E.DirLangStringLiteral,
      ]) => {
        this.verifyCompatibility(litA, litB);
        return op(expressionEvaluator)(litA.typedValue, litB.typedValue);
      },
      addInvalidHandling,
    );
  }

  /**
   * Registers a unary overload that accepts a numeric literal.
   * @param op The unary operation on a numeric literal.
   * @param addInvalidHandling Whether to add non-lexical literal protection.
   */
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

  /**
   * Registers a unary overload that accepts a dateTime literal.
   * @param op The unary operation on a dateTime literal.
   * @param addInvalidHandling Whether to add non-lexical literal protection.
   */
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

  /**
   * Registers a binary numeric comparison test that returns a boolean literal.
   * @param test The comparison function on two numbers.
   */
  public numberTest(
    test: (expressionEvaluator: IInternalEvaluator) => (left: number, right: number) => boolean,
  ): Builder {
    return this.numeric(expressionEvaluator => ([ left, right ]: E.NumericLiteral[]) => {
      const result = test(expressionEvaluator)(left.typedValue, right.typedValue);
      return bool(result);
    });
  }

  /**
   * Registers a binary string comparison test that returns a boolean literal.
   * @param test The comparison function on two strings.
   * @param addInvalidHandling Whether to add non-lexical literal protection.
   */
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

  /**
   * Registers a binary boolean comparison test that returns a boolean literal.
   * @param test The comparison function on two booleans.
   * @param addInvalidHandling Whether to add non-lexical literal protection.
   */
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

  /**
   * Registers a binary dateTime comparison test that returns a boolean literal.
   * @param test The comparison function on two dateTime representations.
   * @param addInvalidHandling Whether to add non-lexical literal protection.
   */
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

  /**
   * Registers a binary overload for two numeric arguments.
   * @param op The binary numeric operation.
   */
  public numeric<T extends TermExpression>(op: ImplementationFunctionTuple<[T, T]>): Builder {
    return this.set([ C.TypeAlias.SPARQL_NUMERIC, C.TypeAlias.SPARQL_NUMERIC ], op);
  }
}

// ----------------------------------------------------------------------------
// Literal Construction helpers
// ----------------------------------------------------------------------------

/**
 * Creates a boolean literal expression.
 * @param val The boolean value.
 * @return A new BooleanLiteral.
 */
export function bool(val: boolean): E.BooleanLiteral {
  return new E.BooleanLiteral(val);
}

/**
 * Creates an integer literal expression.
 * @param num The integer value.
 * @return A new IntegerLiteral.
 */
export function integer(num: number): E.IntegerLiteral {
  return new E.IntegerLiteral(num);
}

/**
 * Creates a decimal literal expression.
 * @param num The decimal value.
 * @return A new DecimalLiteral.
 */
export function decimal(num: number): E.DecimalLiteral {
  return new E.DecimalLiteral(num);
}

/**
 * Creates a float literal expression.
 * @param num The float value.
 * @return A new FloatLiteral.
 */
export function float(num: number): E.FloatLiteral {
  return new E.FloatLiteral(num);
}

/**
 * Creates a double literal expression.
 * @param num The double value.
 * @return A new DoubleLiteral.
 */
export function double(num: number): E.DoubleLiteral {
  return new E.DoubleLiteral(num);
}

/**
 * Creates a string literal expression.
 * @param str The string value.
 * @param dataType Optional datatype URI (defaults to xsd:string).
 * @return A new StringLiteral.
 */
export function string(str: string, dataType?: string): E.StringLiteral {
  return new E.StringLiteral(str, dataType);
}

/**
 * Creates a language-tagged string literal expression.
 * @param str The string value.
 * @param lang The language tag.
 * @return A new LangStringLiteral.
 */
export function langString(str: string, lang: string): E.LangStringLiteral {
  return new E.LangStringLiteral(str, lang);
}

/**
 * Creates a directional language-tagged string literal expression.
 * @param str The string value.
 * @param lang The language tag.
 * @param direction The base direction ('ltr' or 'rtl').
 * @return A new DirLangStringLiteral.
 */
export function dirLangString(str: string, lang: string, direction: 'ltr' | 'rtl'): E.DirLangStringLiteral {
  return new E.DirLangStringLiteral(str, lang, direction);
}

/**
 * Creates a dateTime literal expression.
 * @param date The dateTime representation.
 * @param str The original string value.
 * @return A new DateTimeLiteral.
 */
export function dateTime(date: IDateTimeRepresentation, str: string): E.DateTimeLiteral {
  return new E.DateTimeLiteral(date, str);
}

/**
 * Converts a variable expression to an RDF/JS variable term.
 * @param dataFactory The data factory used to create the variable term.
 * @param variableExpression The variable expression to convert.
 * @return The corresponding RDF/JS variable.
 */
export function expressionToVar(
  dataFactory: ComunicaDataFactory,
  variableExpression: VariableExpression,
): RDF.Variable {
  return dataFactory.variable(variableExpression.name.slice(1));
}
