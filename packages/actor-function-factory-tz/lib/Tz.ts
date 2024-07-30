import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  TypeURL,
  declare,
  string,
  extractRawTimeZone,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-tz
 */
export class Tz extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.TZ;

  protected overloads = declare(RegularOperator.TZ)
    .onDateTime1(
      () => date => string(extractRawTimeZone(date.str())),
    )
    .copy({ from: [ TypeURL.XSD_DATE_TIME ], to: [ TypeURL.XSD_DATE ]})
    .copy({ from: [ TypeURL.XSD_DATE_TIME ], to: [ TypeURL.XSD_TIME ]})
    .collect();
}
