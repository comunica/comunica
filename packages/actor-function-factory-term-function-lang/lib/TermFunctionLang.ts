import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  SparqlOperator,
  string,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-lang
 */
export class TermFunctionLang extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.LANG,
      overloads: declare(SparqlOperator.LANG)
        .onLiteral1(() => lit => string(lit.language ?? ''))
        .collect(),
    });
  }
}
