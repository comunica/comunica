import { TermFunctionBase } from '@comunica/bus-function-factory';
import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';

import {
  DateTimeLiteral,
  declare,
  SparqlOperator,
  toDateTimeRepresentation,
} from '@comunica/utils-expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-now
 */
export class TermFunctionNow extends TermFunctionBase {
  public constructor() {
    super({
      arity: 0,
      operator: SparqlOperator.NOW,
      overloads: declare(SparqlOperator.NOW).set([], exprEval => () =>
        new DateTimeLiteral(toDateTimeRepresentation({
          date: exprEval.context.getSafe(KeysInitQuery.queryTimestamp),
          timeZone: exprEval.context.getSafe(KeysExpressionEvaluator.defaultTimeZone),
        }))).collect(),
    });
  }
}
