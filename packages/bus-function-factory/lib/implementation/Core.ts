import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import type * as E from '@comunica/expression-evaluator/lib/expressions';
import type {
  IEvalContext,
  IInternalEvaluator,
  OverloadTree,
} from '@comunica/expression-evaluator/lib/functions/OverloadTree';
import type * as C from '@comunica/expression-evaluator/lib/util/Consts';
import * as Err from '@comunica/expression-evaluator/lib/util/Errors';
import type { IExpressionFunction, ITermFunction } from '../ActorFunctionFactory';

// ----------------------------------------------------------------------------
// Overloaded Functions
// ----------------------------------------------------------------------------

export abstract class BaseFunctionDefinition implements IExpressionFunction {
  protected abstract readonly arity: number | number[];
  public abstract apply: (evalContext: IEvalContext) => Promise<E.TermExpression>;

  public checkArity(args: E.Expression[]): boolean {
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
export abstract class TermSparqlFunction<O extends C.RegularOperator | C.NamedOperator>
  extends BaseFunctionDefinition implements ITermFunction {
  public readonly supportsTermExpressions = true;
  protected abstract readonly overloads: OverloadTree;
  public abstract operator: O;

  public applyOnTerms(args: E.TermExpression[], exprEval: IInternalEvaluator): E.TermExpression {
    const concreteFunction =
      this.overloads.search(
        args,
        exprEval.context.getSafe(KeysExpressionEvaluator.superTypeProvider),
        exprEval.context.getSafe(KeysInitQuery.functionArgumentsCache),
      ) ?? this.handleInvalidTypes(args);
    return concreteFunction(exprEval)(args);
  }

  public apply = async({ args, exprEval, mapping }: IEvalContext): Promise<E.TermExpression> => this.applyOnTerms(
    await Promise.all(args.map(arg => exprEval.evaluatorExpressionEvaluation(arg, mapping))),
    exprEval,
  );

  protected handleInvalidTypes(args: E.TermExpression[]): never {
    throw new Err.InvalidArgumentTypes(args, this.operator);
  }
}

export abstract class RegularFunction extends TermSparqlFunction<C.RegularOperator> {}

export abstract class NamedFunction extends TermSparqlFunction<C.NamedOperator> {}
