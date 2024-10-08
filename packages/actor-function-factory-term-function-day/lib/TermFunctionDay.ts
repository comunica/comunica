import { TermFunctionBase } from '@comunica/bus-function-factory';
import type {

  DateLiteral,
} from '@comunica/utils-expression-evaluator';
import {
  declare,
  integer,
  SparqlOperator,
  TypeURL,
} from '@comunica/utils-expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-day
 */
export class TermFunctionDay extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.DAY,
      overloads: declare(SparqlOperator.DAY)
        .onDateTime1(
          () => date => integer(date.typedValue.day),
        )
        .set([ TypeURL.XSD_DATE ], () => ([ date ]: [DateLiteral]) => integer(date.typedValue.day))
        .collect(),
    });
  }
}
