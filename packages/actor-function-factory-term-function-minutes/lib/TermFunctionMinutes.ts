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
 * https://www.w3.org/TR/sparql11-query/#func-minutes
 */
export class TermFunctionMinutes extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.MINUTES,
      overloads: declare(SparqlOperator.MINUTES)
        .onDateTime1(() => date => integer(date.typedValue.minutes))
        .set([ TypeURL.XSD_TIME ], () => ([ time ]: [ TimeLiteral]) => integer(time.typedValue.minutes))
        .collect(),
    });
  }
}
