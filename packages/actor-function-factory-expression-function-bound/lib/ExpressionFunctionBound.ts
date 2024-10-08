import { ExpressionFunctionBase } from '@comunica/bus-function-factory';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IEvalContext, TermExpression, VariableExpression } from '@comunica/types';
import { ExpressionType } from '@comunica/types';
import {
  bool,
  expressionToVar,
  InvalidArgumentTypes,
  SparqlOperator,
} from '@comunica/utils-expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-bound
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
export class ExpressionFunctionBound extends ExpressionFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.BOUND,
      apply: async({ args, mapping, exprEval }: IEvalContext): Promise<TermExpression> => {
        const variable = <VariableExpression> args[0];
        if (variable.expressionType !== ExpressionType.Variable) {
          throw new InvalidArgumentTypes(args, SparqlOperator.BOUND);
        }
        const val = mapping.has(expressionToVar(exprEval.context.getSafe(KeysInitQuery.dataFactory), variable));
        return bool(val);
      },
    });
  }
}
