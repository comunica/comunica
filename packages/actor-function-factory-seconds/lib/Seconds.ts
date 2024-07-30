import { RegularFunction } from '@comunica/bus-function-factory';
import type {

  TimeLiteral,
} from '@comunica/expression-evaluator';
import {
  RegularOperator,
  TypeURL,
  decimal,
  declare,
  integer,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-seconds
 */
export class Seconds extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.SECONDS;

  protected overloads = declare(RegularOperator.SECONDS)
    .onDateTime1(() => date => decimal(date.typedValue.seconds))
    .set([ TypeURL.XSD_TIME ], () => ([ time ]: [ TimeLiteral]) => integer(time.typedValue.seconds))
    .collect();
}
