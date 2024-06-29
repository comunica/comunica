import { RegularFunction } from '@comunica/bus-function-factory/lib/implementation';
import { bool, declare } from '@comunica/expression-evaluator/lib/functions/Helpers';
import * as C from '@comunica/expression-evaluator/lib/util/Consts';

export class Not extends RegularFunction {
  protected arity = 1;

  public operator = C.RegularOperator.NOT;

  protected overloads = declare(C.RegularOperator.NOT)
    .onTerm1(() => val => bool(!val.coerceEBV()))
    .collect();
}

