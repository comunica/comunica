import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  TypeURL,
  declare,
  InvalidTimezoneCall,
  DayTimeDurationLiteral,
} from '@comunica/expression-evaluator';
import type { IDayTimeDurationRepresentation } from '@comunica/types';

/**
 * https://www.w3.org/TR/sparql11-query/#func-timezone
 */
export class Timezone extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.TIMEZONE;

  protected overloads = declare(RegularOperator.TIMEZONE)
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
    .collect();
}
