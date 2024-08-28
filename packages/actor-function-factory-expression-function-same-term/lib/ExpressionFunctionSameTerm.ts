import { ExpressionFunctionBase } from '@comunica/bus-function-factory';
import { KeysInitQuery } from '@comunica/context-entries';
import type {
  IEvalContext,
  TermExpression,
} from '@comunica/expression-evaluator';
import {
  bool,
  SparqlOperator,
} from '@comunica/expression-evaluator';
import type { ComunicaDataFactory } from '@comunica/types';

/**
 * https://www.w3.org/TR/sparql11-query/#func-sameTerm
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
export class ExpressionFunctionSameTerm extends ExpressionFunctionBase {
  public constructor() {
    super({
      arity: 2,
      operator: SparqlOperator.SAME_TERM,
      apply: async({ args, mapping, exprEval }: IEvalContext): Promise<TermExpression> => {
        const dataFactory: ComunicaDataFactory = exprEval.context.getSafe(KeysInitQuery.dataFactory);
        const [ leftExpr, rightExpr ] = args.map(arg => exprEval.evaluatorExpressionEvaluation(arg, mapping));
        const [ left, right ] = await Promise.all([ leftExpr, rightExpr ]);
        return bool(left.toRDF(dataFactory).equals(right.toRDF(dataFactory)));
      },
    });
  }
}
