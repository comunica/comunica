import { RegularFunction } from '@comunica/bus-function-factory';
import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';

import {
  RegularOperator,
  declare,
  toDateTimeRepresentation,
  DateTimeLiteral,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-now
 */
export class Now extends RegularFunction {
  protected arity = 0;
  public operator = RegularOperator.NOW;

  protected overloads = declare(RegularOperator.NOW).set([], exprEval => () =>
    new DateTimeLiteral(toDateTimeRepresentation({
      date: exprEval.context.getSafe(KeysInitQuery.queryTimestamp),
      timeZone: exprEval.context.getSafe(KeysExpressionEvaluator.defaultTimeZone),
    }))).collect();
}
