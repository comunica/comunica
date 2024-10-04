import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  NamedNode,
  SparqlOperator,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-datatype
 */
export class TermFunctionDatatype extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.DATATYPE,
      overloads: declare(SparqlOperator.DATATYPE)
        .onLiteral1(() => lit => new NamedNode(lit.dataType))
        .collect(),
    });
  }
}
