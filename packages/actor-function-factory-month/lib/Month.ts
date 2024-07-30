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
 * https://www.w3.org/TR/sparql11-query/#func-month
 */
export class Month extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.MONTH;

  protected overloads = declare(RegularOperator.MONTH)
    .onDateTime1(
      () => date => integer(date.typedValue.month),
    )
    .set([ TypeURL.XSD_DATE ], () => ([ date ]: [ DateLiteral]) => integer(date.typedValue.month))
    .collect();
}
