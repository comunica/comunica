import { TermFunctionBase } from '@comunica/bus-function-factory';
import type { TermExpression } from '@comunica/types';
import type {
  DurationLiteral,
} from '@comunica/utils-expression-evaluator';
import {
  declare,
  parseYearMonthDuration,
  trimToYearMonthDuration,
  TypeURL,
  YearMonthDurationLiteral,
} from '@comunica/utils-expression-evaluator';

export class TermFunctionXsdToYearMonthDuration extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: TypeURL.XSD_YEAR_MONTH_DURATION,
      overloads: declare(TypeURL.XSD_YEAR_MONTH_DURATION)
        // https://www.w3.org/TR/xpath-functions/#casting-to-durations
        .onUnary(TypeURL.XSD_DURATION, () => (val: DurationLiteral) =>
          // Copy is needed to make sure the dataType is changed, even when the provided type was a subtype
          new YearMonthDurationLiteral(trimToYearMonthDuration(val.typedValue)))
        .onStringly1(() => (val: TermExpression) =>
          new YearMonthDurationLiteral(parseYearMonthDuration(val.str())))
        .collect(),
    });
  }
}
