import { TermFunctionBase } from '@comunica/bus-function-factory';
import type {

  TimeLiteral,
} from '@comunica/utils-expression-evaluator';
import {
  decimal,
  declare,
  integer,
  SparqlOperator,
  TypeURL,
} from '@comunica/utils-expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-seconds
 */
export class TermFunctionSeconds extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.SECONDS,
      overloads: declare(SparqlOperator.SECONDS)
        .onDateTime1(() => date => decimal(date.typedValue.seconds))
        .set([ TypeURL.XSD_TIME ], () => ([ time ]: [ TimeLiteral]) => integer(time.typedValue.seconds))
        .collect(),
    });
  }
}
