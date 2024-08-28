import { ExpressionFunctionBase } from '@comunica/bus-function-factory';
import type {
  IEvalContext,
  TermExpression,
} from '@comunica/expression-evaluator';
import {
  CoalesceError,
  SparqlOperator,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-coalesce
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
export class ExpressionFunctionCoalesce extends ExpressionFunctionBase {
  public constructor() {
    super({
      arity: Number.POSITIVE_INFINITY,
      operator: SparqlOperator.COALESCE,
      apply: async({ args, mapping, exprEval }: IEvalContext): Promise<TermExpression> => {
        const errors: Error[] = [];
        for (const expr of args) {
          try {
            return await exprEval.evaluatorExpressionEvaluation(expr, mapping);
          } catch (error: unknown) {
            errors.push(<Error> error);
          }
        }
        throw new CoalesceError(errors);
      },
    });
  }
}
