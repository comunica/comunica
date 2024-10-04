import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  extractRawTimeZone,
  SparqlOperator,
  string,
  TypeURL,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-tz
 */
export class TermFunctionTz extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.TZ,
      overloads: declare(SparqlOperator.TZ)
        .onDateTime1(
          () => date => string(extractRawTimeZone(date.str())),
        )
        .copy({ from: [ TypeURL.XSD_DATE_TIME ], to: [ TypeURL.XSD_DATE ]})
        .copy({ from: [ TypeURL.XSD_DATE_TIME ], to: [ TypeURL.XSD_TIME ]})
        .collect(),
    });
  }
}
