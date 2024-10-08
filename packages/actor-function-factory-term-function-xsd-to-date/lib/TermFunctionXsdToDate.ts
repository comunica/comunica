import { TermFunctionBase } from '@comunica/bus-function-factory';
import type {
  Term,

  DateTimeLiteral,
} from '@comunica/utils-expression-evaluator';
import {
  DateLiteral,
  declare,
  parseDate,
  TypeURL,
} from '@comunica/utils-expression-evaluator';

export class TermFunctionXsdToDate extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: TypeURL.XSD_DATE,
      overloads: declare(TypeURL.XSD_DATE)
        .onUnary(TypeURL.XSD_DATE, () => (val: DateLiteral) => new DateLiteral(val.typedValue, val.strValue))
        .onUnary(TypeURL.XSD_DATE_TIME, () => (val: DateTimeLiteral) =>
          new DateLiteral(val.typedValue))
        .onStringly1(() => (val: Term) => new DateLiteral(parseDate(val.str())))
        .collect(),
    });
  }
}
