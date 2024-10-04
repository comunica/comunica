import { TermFunctionBase } from '@comunica/bus-function-factory';
import type {
  TermExpression,

  DurationLiteral,
} from '@comunica/expression-evaluator';
import {
  DayTimeDurationLiteral,
  declare,
  parseDayTimeDuration,
  trimToDayTimeDuration,
  TypeURL,
} from '@comunica/expression-evaluator';

export class TermFunctionXsdToDayTimeDuration extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: TypeURL.XSD_DAY_TIME_DURATION,
      overloads: declare(TypeURL.XSD_DAY_TIME_DURATION)
        // https://www.w3.org/TR/xpath-functions/#casting-to-durations
        .onUnary(TypeURL.XSD_DURATION, () => (val: DurationLiteral) =>
          // Copy is needed to make sure the dataType is changed, even when the provided type was a subtype
          new DayTimeDurationLiteral(trimToDayTimeDuration(val.typedValue)))
        .onStringly1(() => (val: TermExpression) =>
          new DayTimeDurationLiteral(parseDayTimeDuration(val.str())))
        .collect(),
    });
  }
}
