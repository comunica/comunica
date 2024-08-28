import { ExpressionFunctionBase } from '@comunica/bus-function-factory';
import type {
  IEvalContext,
  TermExpression,
} from '@comunica/expression-evaluator';
import {
  SparqlOperator,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-if
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
export class ExpressionFunctionIf extends ExpressionFunctionBase {
  public constructor() {
    super({
      arity: 3,
      operator: SparqlOperator.IF,
      apply: async({ args, mapping, exprEval }: IEvalContext): Promise<TermExpression> => {
        const valFirst = await exprEval.evaluatorExpressionEvaluation(args[0], mapping);
        const ebv = valFirst.coerceEBV();
        return ebv ?
          exprEval.evaluatorExpressionEvaluation(args[1], mapping) :
          exprEval.evaluatorExpressionEvaluation(args[2], mapping);
      },
    });
  }
}
