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
 * https://www.w3.org/TR/sparql11-query/#func-year
 */
export class Year extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.YEAR;

  protected overloads = declare(RegularOperator.YEAR)
    .onDateTime1(
      () => date => integer(date.typedValue.year),
    )
    .set([ TypeURL.XSD_DATE ], () => ([ date ]: [DateLiteral ]) => integer(date.typedValue.year))
    .collect();
}
