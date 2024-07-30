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
 * https://www.w3.org/TR/sparql11-query/#func-hours
 */
export class Hours extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.HOURS;

  protected overloads = declare(RegularOperator.HOURS)
    .onDateTime1(
      () => date => integer(date.typedValue.hours),
    )
    .set([ TypeURL.XSD_TIME ], () => ([ time ]: [ TimeLiteral]) => integer(time.typedValue.hours))
    .collect();
}
