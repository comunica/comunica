import { RegularFunction } from '@comunica/bus-function-factory/lib/implementation';
import { declare } from '@comunica/expression-evaluator/lib/functions/Helpers';
import * as C from '@comunica/expression-evaluator/lib/util/Consts';

export class Abs extends RegularFunction {
  protected arity = 1;
  public operator = C.RegularOperator.ABS;

  protected overloads = declare(C.RegularOperator.ABS)
    .numericConverter(() => num => Math.abs(num))
    .collect();
}
