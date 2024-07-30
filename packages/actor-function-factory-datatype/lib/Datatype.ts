import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  declare,
  NamedNode,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-datatype
 */
export class Datatype extends RegularFunction {
  protected arity = 1;
  public operator = RegularOperator.DATATYPE;

  protected overloads = declare(RegularOperator.DATATYPE)
    .onLiteral1(() => lit => new NamedNode(lit.dataType))
    .collect();
}
