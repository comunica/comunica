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
 * https://www.w3.org/TR/sparql11-query/#func-month
 */
export class TermFunctionMonth extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.MONTH,
      overloads: declare(SparqlOperator.MONTH)
        .onDateTime1(
          () => date => integer(date.typedValue.month),
        )
        .set([ TypeURL.XSD_DATE ], () => ([ date ]: [DateLiteral]) => integer(date.typedValue.month))
        .collect(),
    });
  }
}
