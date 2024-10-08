import type { ITermFunction } from '@comunica/bus-function-factory';
import { ExpressionFunctionBase } from '@comunica/bus-function-factory';
import type { Expression, IEvalContext, TermExpression } from '@comunica/types';
import type {
  BooleanLiteral,
} from '@comunica/utils-expression-evaluator';
import {
  bool,
  InError,
  SparqlOperator,
} from '@comunica/utils-expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-in
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
export class ExpressionFunctionIn extends ExpressionFunctionBase {
  public constructor(private readonly equalityFunction: ITermFunction) {
    super({
      arity: Number.POSITIVE_INFINITY,
      operator: SparqlOperator.IN,
      apply: async(context: IEvalContext): Promise<TermExpression> => {
        const { args, mapping, exprEval } = context;
        const [ leftExpr, ...remaining ] = args;
        const left = await exprEval.evaluatorExpressionEvaluation(leftExpr, mapping);
        return await this.inRecursive(left, { ...context, args: remaining }, []);
      },
    });
  }

  public override checkArity(args: Expression[]): boolean {
    return args.length > 0;
  }

  private async inRecursive(
    needle: TermExpression,
    context: IEvalContext,
    results: (Error | false)[],
  ): Promise<TermExpression> {
    const { args, mapping, exprEval } = context;
    if (args.length === 0) {
      const noErrors = results.every(val => !val);
      return noErrors ? bool(false) : Promise.reject(new InError(results));
    }

    try {
      // We know this will not be undefined because we check args.length === 0
      const nextExpression = args.shift()!;
      const next = await exprEval.evaluatorExpressionEvaluation(nextExpression, mapping);
      if ((<BooleanLiteral> this.equalityFunction.applyOnTerms([ needle, next ], exprEval)).typedValue) {
        return bool(true);
      }
      return this.inRecursive(needle, context, [ ...results, false ]);
    } catch (error: unknown) {
      return this.inRecursive(needle, context, [ ...results, <Error> error ]);
    }
  }
}
