import { TermFunctionBase } from '@comunica/bus-function-factory';
import type {

  TimeLiteral,
} from '@comunica/utils-expression-evaluator';
import {
  declare,
  integer,
  SparqlOperator,
  TypeURL,
} from '@comunica/utils-expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-hours
 */
export class TermFunctionHours extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.HOURS,
      overloads: declare(SparqlOperator.HOURS)
        .onDateTime1(
          () => date => integer(date.typedValue.hours),
        )
        .set([ TypeURL.XSD_TIME ], () => ([ time ]: [TimeLiteral]) => integer(time.typedValue.hours))
        .collect(),
    });
  }
}
