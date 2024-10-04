import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import type { Expression, IEvalContext, IInternalEvaluator, TermExpression } from '@comunica/types';
import type {
  GeneralOperator,
  OverloadTree,
} from '../../../utils-expression-evaluator';
import { InvalidArgumentTypes,
} from '../../../utils-expression-evaluator';
import type { IExpressionFunction, ITermFunction } from '../ActorFunctionFactory';

// ----------------------------------------------------------------------------
// Overloaded Functions
// ----------------------------------------------------------------------------

interface BaseFunctionDefinitionArgs {
  arity: number | number[];
  operator: GeneralOperator;
  apply: (evalContext: IEvalContext) => Promise<TermExpression>;
}

export class ExpressionFunctionBase implements IExpressionFunction {
  protected readonly arity: number | number[];
  public readonly operator: GeneralOperator;
  public readonly apply: (evalContext: IEvalContext) => Promise<TermExpression>;

  public constructor({ arity, operator, apply }: BaseFunctionDefinitionArgs) {
    this.arity = arity;
    this.operator = operator;
    this.apply = apply;
  }

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
  public readonly supportsTermExpressions = true;
  protected readonly overloads: OverloadTree;

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

  public applyOnTerms(args: TermExpression[], exprEval: IInternalEvaluator): TermExpression {
    const concreteFunction =
      this.overloads.search(
        args,
        exprEval.context.getSafe(KeysExpressionEvaluator.superTypeProvider),
        exprEval.context.getSafe(KeysInitQuery.functionArgumentsCache),
      ) ?? this.handleInvalidTypes(args);
    return concreteFunction(exprEval)(args);
  }

  protected handleInvalidTypes(args: TermExpression[]): never {
    throw new InvalidArgumentTypes(args, this.operator);
  }
}
