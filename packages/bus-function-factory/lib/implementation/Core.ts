import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import type { Expression, IEvalContext, IInternalEvaluator, TermExpression } from '@comunica/types';
import type {
  GeneralOperator,
  OverloadTree,
} from '@comunica/utils-expression-evaluator';
import { InvalidArgumentTypes,
} from '@comunica/utils-expression-evaluator';
import type { IExpressionFunction, ITermFunction } from '../ActorFunctionFactory';

// ----------------------------------------------------------------------------
// Overloaded Functions
// ----------------------------------------------------------------------------

interface BaseFunctionDefinitionArgs {
  arity: number | number[];
  operator: GeneralOperator;
  apply: (evalContext: IEvalContext) => Promise<TermExpression>;
}

/**
 * Base implementation of an expression-level SPARQL function.
 */
export class ExpressionFunctionBase implements IExpressionFunction {
  /**
   * The number of arguments this function accepts.
   * Can be a single number, an array of accepted arities, or `Infinity` for variadic functions.
   */
  protected readonly arity: number | number[];
  /**
   * The operator identifier for this function.
   */
  public readonly operator: GeneralOperator;
  /**
   * Applies the function in the given evaluation context.
   * @param evalContext The expression evaluation context providing arguments and bindings.
   * @return A promise resolving to the resulting term expression.
   */
  public readonly apply: (evalContext: IEvalContext) => Promise<TermExpression>;

  /**
   * Constructs a new expression function base.
   */
  public constructor({ arity, operator, apply }: BaseFunctionDefinitionArgs) {
    this.arity = arity;
    this.operator = operator;
    this.apply = apply;
  }

  /**
   * Checks whether the given arguments match the expected arity of this function.
   * @param args The expressions to validate against the expected arity.
   * @return `true` if the number of arguments is valid, `false` otherwise.
   */
  public checkArity(args: Expression[]): boolean {
    if (Array.isArray(this.arity)) {
      return this.arity.includes(args.length);
    }
    if (this.arity === Number.POSITIVE_INFINITY) {
      // Infinity is used to represent var-args, so it's always correct.
      return true;
    }

    return args.length === this.arity;
  }
}

interface TermSparqlFunctionArgs {
  arity: number | number[];
  operator: GeneralOperator;
  overloads: OverloadTree;
}

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
 * See also: https://www.w3.org/TR/definitionTypesparql11-query/#func-rdfTerms
 * and https://www.w3.org/TR/sparql11-query/#OperatorMapping
 */
export class TermFunctionBase extends ExpressionFunctionBase implements ITermFunction {
  /**
   * Flag indicating that this function supports direct term expression evaluation.
   */
  public readonly supportsTermExpressions = true;
  /**
   * The overload tree for resolving type-specific function implementations.
   */
  protected readonly overloads: OverloadTree;

  /**
   * Constructs a new term function base.
   */
  public constructor({ arity, operator, overloads }: TermSparqlFunctionArgs) {
    super({
      arity,
      operator,
      apply: async({ args, exprEval, mapping }: IEvalContext): Promise<TermExpression> => this.applyOnTerms(
        await Promise.all(args.map(arg => exprEval.evaluatorExpressionEvaluation(arg, mapping))),
        exprEval,
      ),
    });

    this.overloads = overloads;
  }

  /**
   * Applies the function directly on an array of term expressions.
   * @param args The term expression arguments to evaluate.
   * @param exprEval The internal evaluator used during evaluation.
   * @return The resulting term expression.
   */
  public applyOnTerms(args: TermExpression[], exprEval: IInternalEvaluator): TermExpression {
    const concreteFunction =
      this.overloads.search(
        args,
        exprEval.context.getSafe(KeysExpressionEvaluator.superTypeProvider),
        exprEval.context.getSafe(KeysInitQuery.functionArgumentsCache),
      ) ?? this.handleInvalidTypes(args);
    return concreteFunction(exprEval)(args);
  }

  /**
   * Handles invalid argument types by throwing an error.
   * @param args The term expressions with invalid types.
   * @throws InvalidArgumentTypes Always thrown to indicate the arguments do not match any overload.
   */
  protected handleInvalidTypes(args: TermExpression[]): never {
    throw new InvalidArgumentTypes(args, this.operator);
  }
}
