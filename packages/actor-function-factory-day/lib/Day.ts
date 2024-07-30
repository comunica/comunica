import { RegularFunction } from '@comunica/bus-function-factory';
import type {

  DateLiteral,
} from '@comunica/expression-evaluator';
import {
  RegularOperator,
  TypeURL,
  declare,
  integer,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-day
 */
export class Day extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.DAY;

  protected overloads = declare(RegularOperator.DAY)
    .onDateTime1(
      () => date => integer(date.typedValue.day),
    )
    .set([ TypeURL.XSD_DATE ], () => ([ date ]: [ DateLiteral]) => integer(date.typedValue.day))
    .collect();
}
