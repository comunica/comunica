import { TermFunctionBase } from '@comunica/bus-function-factory';
import type { TermExpression } from '@comunica/types';
import type {
  DateTimeLiteral,
} from '@comunica/utils-expression-evaluator';
import {
  declare,
  parseTime,
  TimeLiteral,
  TypeURL,
} from '@comunica/utils-expression-evaluator';

export class TermFunctionXsdToTime extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: TypeURL.XSD_TIME,
      overloads: declare(TypeURL.XSD_TIME)
        .onUnary(TypeURL.XSD_TIME, () => (val: TimeLiteral) => new TimeLiteral(val.typedValue, val.strValue))
        .onUnary(TypeURL.XSD_DATE_TIME, () => (val: DateTimeLiteral) =>
          new TimeLiteral(val.typedValue))
        .onStringly1(() => (val: TermExpression) => new TimeLiteral(parseTime(val.str())))
        .collect(),
    });
  }
}
