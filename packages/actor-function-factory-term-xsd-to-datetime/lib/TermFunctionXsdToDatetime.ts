import { TermFunctionBase } from '@comunica/bus-function-factory';
import type { TermExpression } from '@comunica/types';
import type {
  DateLiteral,
} from '@comunica/utils-expression-evaluator';
import {
  dateTime,
  DateTimeLiteral,
  declare,
  parseDateTime,
  TypeURL,
} from '@comunica/utils-expression-evaluator';

export class TermFunctionXsdToDatetime extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: TypeURL.XSD_DATE_TIME,
      overloads: declare(TypeURL.XSD_DATE_TIME)
        .onUnary(TypeURL.XSD_DATE_TIME, () => (val: DateTimeLiteral) => val)
        .onUnary(TypeURL.XSD_STRING, () => (val: TermExpression) =>
          dateTime(parseDateTime(val.str()), val.str()), false)
        .onUnary(TypeURL.XSD_DATE, () => (val: DateLiteral) =>
          new DateTimeLiteral({ ...val.typedValue, hours: 0, minutes: 0, seconds: 0 }))
        .collect(),
    });
  }
}
