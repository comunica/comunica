import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  SparqlOperator,
  string,
} from '@comunica/utils-expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-lang
 */
export class TermFunctionLangdir extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.LANGDIR,
      overloads: declare(SparqlOperator.LANGDIR)
        .onLiteral1(() => lit => string(lit.direction ?? ''))
        .collect(),
    });
  }
}
