import { TermFunctionBase } from '@comunica/bus-function-factory';
import type {

  DayTimeDurationLiteral,
  DurationLiteral,
} from '@comunica/utils-expression-evaluator';
import {
  addDurationToDateTime,
  DateLiteral,
  DateTimeLiteral,
  declare,
  defaultedDateTimeRepresentation,
  defaultedDurationRepresentation,
  SparqlOperator,
  TimeLiteral,
  TypeURL,
} from '@comunica/utils-expression-evaluator';
import { BigNumber } from 'bignumber.js';

export class TermFunctionAddition extends TermFunctionBase {
  public constructor() {
    super({
      arity: 2,
      operator: SparqlOperator.ADDITION,
      overloads: declare(SparqlOperator.ADDITION)
        .arithmetic(() => (left, right) => new BigNumber(left).plus(right).toNumber())
        .set([ TypeURL.XSD_DATE_TIME, TypeURL.XSD_DAY_TIME_DURATION ], () =>
          ([ date, dur ]: [ DateTimeLiteral, DayTimeDurationLiteral ]) =>
          // https://www.w3.org/TR/xpath-functions/#func-add-dayTimeDuration-to-dateTime
            new DateTimeLiteral(
              addDurationToDateTime(date.typedValue, defaultedDurationRepresentation(dur.typedValue)),
            ))
        .copy({
          from: [ TypeURL.XSD_DATE_TIME, TypeURL.XSD_DAY_TIME_DURATION ],
          to: [ TypeURL.XSD_DATE_TIME, TypeURL.XSD_YEAR_MONTH_DURATION ],
        })
        .set([ TypeURL.XSD_DATE, TypeURL.XSD_DAY_TIME_DURATION ], () =>
          ([ date, dur ]: [DateLiteral, DurationLiteral]) =>
          // https://www.w3.org/TR/xpath-functions/#func-add-dayTimeDuration-to-date
            new DateLiteral(
              addDurationToDateTime(
                defaultedDateTimeRepresentation(date.typedValue),
                defaultedDurationRepresentation(dur.typedValue),
              ),
            ))
        .copy({
          from: [ TypeURL.XSD_DATE, TypeURL.XSD_DAY_TIME_DURATION ],
          to: [ TypeURL.XSD_DATE, TypeURL.XSD_YEAR_MONTH_DURATION ],
        })
        .set([ TypeURL.XSD_TIME, TypeURL.XSD_DAY_TIME_DURATION ], () =>
          ([ time, dur ]: [TimeLiteral, DurationLiteral]) =>
          // https://www.w3.org/TR/xpath-functions/#func-add-dayTimeDuration-to-time
            new TimeLiteral(
              addDurationToDateTime(
                defaultedDateTimeRepresentation(time.typedValue),
                defaultedDurationRepresentation(dur.typedValue),
              ),
            ))
        .copy({
          from: [ TypeURL.XSD_TIME, TypeURL.XSD_DAY_TIME_DURATION ],
          to: [ TypeURL.XSD_TIME, TypeURL.XSD_YEAR_MONTH_DURATION ],
        })
        .collect(),
    });
  }
}
