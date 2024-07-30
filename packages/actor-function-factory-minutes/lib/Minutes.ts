import { RegularFunction } from '@comunica/bus-function-factory';
import type {

  TimeLiteral,
} from '@comunica/expression-evaluator';
import {
  RegularOperator,
  TypeURL,
  declare,
  integer,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-minutes
 */
export class Minutes extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.MINUTES;

  protected overloads = declare(RegularOperator.MINUTES)
    .onDateTime1(() => date => integer(date.typedValue.minutes))
    .set([ TypeURL.XSD_TIME ], () => ([ time ]: [ TimeLiteral]) => integer(time.typedValue.minutes))
    .collect();
}
