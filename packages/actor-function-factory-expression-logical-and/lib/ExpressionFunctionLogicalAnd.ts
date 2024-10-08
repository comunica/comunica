import { ExpressionFunctionBase } from '@comunica/bus-function-factory';
import type { IEvalContext, TermExpression } from '@comunica/types';
import {
  bool,
  SparqlOperator,
} from '@comunica/utils-expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-logical-and
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
export class ExpressionFunctionLogicalAnd extends ExpressionFunctionBase {
  public constructor() {
    super({
      arity: 2,
      operator: SparqlOperator.LOGICAL_AND,
      apply: async({ args, mapping, exprEval }: IEvalContext): Promise<TermExpression> => {
        const [ leftExpr, rightExpr ] = args;
        try {
          const leftTerm = await exprEval.evaluatorExpressionEvaluation(leftExpr, mapping);
          const left = leftTerm.coerceEBV();
          if (!left) {
            return bool(false);
          }
          const rightTerm = await exprEval.evaluatorExpressionEvaluation(rightExpr, mapping);
          const right = rightTerm.coerceEBV();
          return bool(right);
        } catch (error: unknown) {
          const rightErrorTerm = await exprEval.evaluatorExpressionEvaluation(rightExpr, mapping);
          const rightError = rightErrorTerm.coerceEBV();
          if (rightError) {
            throw error;
          }
          return bool(false);
        }
      },
    });
  }
}
