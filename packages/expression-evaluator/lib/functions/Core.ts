import type { IEvalContext, IFunctionExpression } from '@comunica/types';
import type { ExpressionEvaluator } from '../evaluators/ExpressionEvaluator';
import type * as E from '../expressions';
import type * as C from '../util/Consts';
import * as Err from '../util/Errors';
import type { ISuperTypeProvider } from '../util/TypeHandling';
import type { FunctionArgumentsCache, ImplementationFunction, OverloadTree } from './OverloadTree';

// ----------------------------------------------------------------------------
// Overloaded Functions
// ----------------------------------------------------------------------------

// Function and operator arguments are 'flattened' in the SPARQL spec.
// If the argument is a literal, the datatype often also matters.
export type ArgumentType = 'term' | E.TermType | C.TypeURL | C.TypeAlias;

export interface IOverloadedDefinition {
  arity: number | number[];
  overloads: OverloadTree;
}

export abstract class BaseFunction<Operator> implements IFunctionExpression {
  private readonly arity: number | number[];
  private readonly overloads: OverloadTree;

  protected constructor(public operator: Operator, definition: IOverloadedDefinition) {
    this.arity = definition.arity;
    this.overloads = definition.overloads;
  }

  public checkArity(args: E.Expression[]): boolean {
    // If the function has overloaded arity, the actual arity needs to be present.
    if (Array.isArray(this.arity)) {
      return this.arity.includes(args.length);
    }

    return args.length === this.arity;
  }

  /**
   * A function application works by monomorphing the function to a specific
   * instance depending on the runtime types. We then just apply this function
   * to the args.
   */
  public syncApply(args: E.TermExpression[], exprEval: ExpressionEvaluator): E.TermExpression {
    const concreteFunction =
      this.monomorph(args, exprEval.context.superTypeProvider, exprEval.context.functionArgumentsCache) ||
      this.handleInvalidTypes(args);
    return concreteFunction(exprEval)(args);
  }

  public async apply({ args, exprEval }: IEvalContext): Promise<E.TermExpression> {
    return this.syncApply(<E.TermExpression[]> args, exprEval);
  }

  protected abstract handleInvalidTypes(args: E.TermExpression[]): never;

  /**
   * We monomorph by checking the map of overloads for keys corresponding
   * to the runtime types. We start by checking for an implementation for the
   * most concrete types (integer, string, date, IRI), if we find none,
   * we consider their term types (literal, blank, IRI), and lastly we consider
   * all arguments as generic terms.
   *
   * Another option would be to populate the overloads with an implementation
   * for every concrete type when the function is generic over termtypes or
   * terms.
   */
  private monomorph(args: E.TermExpression[], superTypeProvider: ISuperTypeProvider,
    functionArgumentsCache: FunctionArgumentsCache): ImplementationFunction | undefined {
    return this.overloads.search(args, superTypeProvider, functionArgumentsCache);
  }
}

// Regular Functions ----------------------------------------------------------

/**
 * Varying kinds of functions take arguments of different types on which the
 * specific behaviour is dependant. Although their behaviour is often varying,
 * it is always relatively simple, and better suited for synced behaviour.
 * The types of their arguments are always terms, but might differ in
 * their term-type (eg: iri, literal),
 * their specific literal type (eg: string, integer),
 * their arity (see BNODE),
 * or even their specific numeric type (eg: integer, float).
 *
 * Examples include:
 *  - Arithmetic operations such as: *, -, /, +
 *  - Bool operators such as: =, !=, <=, <, ...
 *  - Functions such as: str, IRI
 *
 * See also: https://www.w3.org/TR/sparql11-query/#func-rdfTerms
 * and https://www.w3.org/TR/sparql11-query/#OperatorMapping
 */
export class RegularFunction extends BaseFunction<C.RegularOperator> {
  public constructor(op: C.RegularOperator, definition: IOverloadedDefinition) {
    super(op, definition);
  }

  protected handleInvalidTypes(args: E.TermExpression[]): never {
    throw new Err.InvalidArgumentTypes(args, this.operator);
  }
}

// Named Functions ------------------------------------------------------------
export class NamedFunction extends BaseFunction<C.NamedOperator> {
  public constructor(op: C.NamedOperator, definition: IOverloadedDefinition) {
    super(op, definition);
  }

  protected handleInvalidTypes(args: E.TermExpression[]): never {
    throw new Err.InvalidArgumentTypes(args, this.operator);
  }
}

// Special Functions ----------------------------------------------------------
/**
 * Special Functions are those that don't really fit in sensible categories and
 * have extremely heterogeneous signatures that make them impossible to abstract
 * over. They are small in number, and their behaviour is often complex and open
 * for multiple correct implementations with different trade-offs.
 *
 * Due to their varying nature, they need all available information present
 * during evaluation. This reflects in the signature of the apply() method.
 *
 * They need access to an evaluator to be able to even implement their logic.
 * Especially relevant for IF, and the logical connectives.
 *
 * They can have both sync and async implementations, and both would make sense
 * in some contexts.
 */
export class SpecialFunction implements IFunctionExpression {
  public arity: number;
  public apply: E.SpecialApplicationAsync;
  public checkArity: (args: E.Expression[]) => boolean;

  public constructor(public operator: C.SpecialOperator, definition: ISpecialDefinition) {
    this.arity = definition.arity;
    this.apply = definition.applyAsync;
    this.checkArity = definition.checkArity || defaultArityCheck(this.arity);
  }
}

function defaultArityCheck(arity: number): (args: E.Expression[]) => boolean {
  return (args: E.Expression[]): boolean => {
    // Infinity is used to represent var-args, so it's always correct.
    if (arity === Number.POSITIVE_INFINITY) {
      return true;
    }

    return args.length === arity;
  };
}

export interface ISpecialDefinition {
  arity: number;
  applyAsync: E.SpecialApplicationAsync;
  checkArity?: (args: E.Expression[]) => boolean;
}
