import { RegularFunction } from '@comunica/bus-function-factory/lib/implementation';
import { declare, RegularOperator } from '@comunica/expression-evaluator';

export class Abs extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.ABS;

  protected overloads = declare(C.RegularOperator.ABS)
    .numericConverter(() => num => Math.abs(num))
    .collect();
}
