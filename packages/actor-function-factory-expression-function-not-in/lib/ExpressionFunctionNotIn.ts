import type { IExpressionFunction } from '@comunica/bus-function-factory';
import { ExpressionFunctionBase } from '@comunica/bus-function-factory';
import type { Expression, IEvalContext, TermExpression } from '@comunica/types';
import type {
  BooleanLiteral,
} from '@comunica/utils-expression-evaluator';
import {
  bool,
  SparqlOperator,
} from '@comunica/utils-expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-not-in
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
export class ExpressionFunctionNotIn extends ExpressionFunctionBase {
  public constructor(private readonly inFunction: IExpressionFunction) {
    super({
      arity: Number.POSITIVE_INFINITY,
      operator: SparqlOperator.NOT_IN,
      apply: async(context: IEvalContext): Promise<TermExpression> => {
        const isIn = await this.inFunction.apply(context);
        return bool(!(<BooleanLiteral> isIn).typedValue);
      },
    });
  }

  public override checkArity(args: Expression[]): boolean {
    return args.length > 0;
  }
}
