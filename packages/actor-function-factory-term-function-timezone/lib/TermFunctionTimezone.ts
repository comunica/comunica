import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  DayTimeDurationLiteral,
  declare,
  InvalidTimezoneCall,
  SparqlOperator,
  TypeURL,
} from '@comunica/expression-evaluator';
import type { IDayTimeDurationRepresentation } from '@comunica/types';

/**
 * https://www.w3.org/TR/sparql11-query/#func-timezone
 */
export class TermFunctionTimezone extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.TIMEZONE,
      overloads: declare(SparqlOperator.TIMEZONE)
        .onDateTime1(
          () => (date) => {
            const duration: Partial<IDayTimeDurationRepresentation> = {
              hours: date.typedValue.zoneHours,
              minutes: date.typedValue.zoneMinutes,
            };
            if (duration.hours === undefined && duration.minutes === undefined) {
              throw new InvalidTimezoneCall(date.str());
            }
            return new DayTimeDurationLiteral(duration);
          },
        )
        .copy({ from: [ TypeURL.XSD_DATE_TIME ], to: [ TypeURL.XSD_DATE ]})
        .copy({ from: [ TypeURL.XSD_DATE_TIME ], to: [ TypeURL.XSD_TIME ]})
        .collect(),
    });
  }
}
