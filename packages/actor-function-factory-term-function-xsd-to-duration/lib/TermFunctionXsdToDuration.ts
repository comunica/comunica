import { TermFunctionBase } from '@comunica/bus-function-factory';
import type {
  TermExpression,
} from '@comunica/expression-evaluator';
import {
  declare,
  DurationLiteral,
  parseDuration,
  TypeURL,
} from '@comunica/expression-evaluator';

export class TermFunctionXsdToDuration extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: TypeURL.XSD_DAY_TIME_DURATION,
      overloads: declare(TypeURL.XSD_DURATION)
        // https://www.w3.org/TR/xpath-functions/#casting-to-durations
        .onUnary(TypeURL.XSD_DURATION, () => (val: DurationLiteral) =>
          // Copy is needed to make sure the dataType is changed, even when the provided type was a subtype
          new DurationLiteral(val.typedValue, val.strValue))
        .onStringly1(() => (val: TermExpression) =>
          new DurationLiteral(parseDuration(val.str())))
        .collect(),
    });
  }
}
