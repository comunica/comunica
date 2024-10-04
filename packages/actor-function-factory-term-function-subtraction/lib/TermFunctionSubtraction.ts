import { TermFunctionBase } from '@comunica/bus-function-factory';
import { KeysExpressionEvaluator } from '@comunica/context-entries';

import {
  addDurationToDateTime,
  DateLiteral,
  DateTimeLiteral,
  DayTimeDurationLiteral,
  declare,
  defaultedDateTimeRepresentation,
  defaultedDurationRepresentation,
  elapsedDuration,
  negateDuration,
  SparqlOperator,
  TimeLiteral,
  TypeURL,
} from '@comunica/utils-expression-evaluator';
import { BigNumber } from 'bignumber.js';

export class TermFunctionSubtraction extends TermFunctionBase {
  public constructor() {
    super({
      arity: 2,
      operator: SparqlOperator.SUBTRACTION,
      overloads: declare(SparqlOperator.SUBTRACTION)
        .arithmetic(() => (left, right) => new BigNumber(left).minus(right).toNumber())
        .set([ TypeURL.XSD_DATE_TIME, TypeURL.XSD_DATE_TIME ], exprEval =>
          ([ date1, date2 ]: [ DateTimeLiteral, DateTimeLiteral ]) =>
          // https://www.w3.org/TR/xpath-functions/#func-subtract-dateTimes;
            new DayTimeDurationLiteral(elapsedDuration(
              date1.typedValue,
              date2.typedValue,
              exprEval.context.getSafe(KeysExpressionEvaluator.defaultTimeZone),
            )))
        .copy({ from: [ TypeURL.XSD_DATE_TIME, TypeURL.XSD_DATE_TIME ], to: [ TypeURL.XSD_DATE, TypeURL.XSD_DATE ]})
        .copy({ from: [ TypeURL.XSD_DATE_TIME, TypeURL.XSD_DATE_TIME ], to: [ TypeURL.XSD_TIME, TypeURL.XSD_TIME ]})
        .set([ TypeURL.XSD_DATE_TIME, TypeURL.XSD_DAY_TIME_DURATION ], () =>
          ([ date, dur ]: [ DateTimeLiteral, DayTimeDurationLiteral ]) =>
          // https://www.w3.org/TR/xpath-functions/#func-subtract-dayTimeDuration-from-dateTime
            new DateTimeLiteral(addDurationToDateTime(
              date.typedValue,
              defaultedDurationRepresentation(negateDuration(dur.typedValue)),
            )))
        .copy({
          from: [ TypeURL.XSD_DATE_TIME, TypeURL.XSD_DAY_TIME_DURATION ],
          to: [ TypeURL.XSD_DATE_TIME, TypeURL.XSD_YEAR_MONTH_DURATION ],
        })
        .set([ TypeURL.XSD_DATE, TypeURL.XSD_DAY_TIME_DURATION ], () =>
          ([ date, dur ]: [ DateLiteral, DayTimeDurationLiteral ]) =>
          // https://www.w3.org/TR/xpath-functions/#func-subtract-dayTimeDuration-from-date
            new DateLiteral(addDurationToDateTime(
              defaultedDateTimeRepresentation(date.typedValue),
              defaultedDurationRepresentation(negateDuration(dur.typedValue)),
            )))
        .copy({
          from: [ TypeURL.XSD_DATE, TypeURL.XSD_DAY_TIME_DURATION ],
          to: [ TypeURL.XSD_DATE, TypeURL.XSD_YEAR_MONTH_DURATION ],
        })
        .set([ TypeURL.XSD_TIME, TypeURL.XSD_DAY_TIME_DURATION ], () =>
          ([ time, dur ]: [ TimeLiteral, DayTimeDurationLiteral ]) =>
          // https://www.w3.org/TR/xpath-functions/#func-subtract-dayTimeDuration-from-date
            new TimeLiteral(addDurationToDateTime(
              defaultedDateTimeRepresentation(time.typedValue),
              defaultedDurationRepresentation(negateDuration(dur.typedValue)),
            )))
        .collect(),
    });
  }
}
