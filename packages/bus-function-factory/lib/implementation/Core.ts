import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import * as Eval from '@comunica/expression-evaluator';
import type {
  IEvalContext,
  IInternalEvaluator,
  OverloadTree,
} from '@comunica/expression-evaluator';
import type { IExpressionFunction, ITermFunction } from '../ActorFunctionFactory';

// ----------------------------------------------------------------------------
// Overloaded Functions
// ----------------------------------------------------------------------------

export abstract class BaseFunctionDefinition implements IExpressionFunction {
  protected abstract readonly arity: number | number[];
  public abstract apply: (evalContext: IEvalContext) => Promise<Eval.TermExpression>;
  public abstract operator: Eval.GeneralOperator;

  public checkArity(args: Eval.Expression[]): boolean {
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
export abstract class TermSparqlFunction
  extends BaseFunctionDefinition implements ITermFunction {
  public readonly supportsTermExpressions = true;
  protected abstract readonly overloads: OverloadTree;

  public applyOnTerms(args: Eval.TermExpression[], exprEval: IInternalEvaluator): Eval.TermExpression {
    const concreteFunction =
      this.overloads.search(
        args,
        exprEval.context.getSafe(KeysExpressionEvaluator.superTypeProvider),
        exprEval.context.getSafe(KeysInitQuery.functionArgumentsCache),
      ) ?? this.handleInvalidTypes(args);
    return concreteFunction(exprEval)(args);
  }

  public apply = async({ args, exprEval, mapping }: IEvalContext): Promise<Eval.TermExpression> => this.applyOnTerms(
    await Promise.all(args.map(arg => exprEval.evaluatorExpressionEvaluation(arg, mapping))),
    exprEval,
  );

  protected handleInvalidTypes(args: Eval.TermExpression[]): never {
    throw new Eval.InvalidArgumentTypes(args, this.operator);
  }
}
