import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  bool,
  declare,
} from '@comunica/expression-evaluator';

export class Not extends RegularFunction {
  protected arity = 1;

  public operator = RegularOperator.NOT;

  protected overloads = declare(RegularOperator.NOT)
    .onTerm1(() => val => bool(!val.coerceEBV()))
    .collect();
}
