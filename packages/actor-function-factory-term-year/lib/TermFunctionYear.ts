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
 * https://www.w3.org/TR/sparql11-query/#func-year
 */
export class TermFunctionYear extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.YEAR,
      overloads: declare(SparqlOperator.YEAR)
        .onDateTime1(
          () => date => integer(date.typedValue.year),
        )
        .set([ TypeURL.XSD_DATE ], () => ([ date ]: [DateLiteral]) => integer(date.typedValue.year))
        .collect(),
    });
  }
}
