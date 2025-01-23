import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  langString,
  SparqlOperator,
  string,
} from '@comunica/utils-expression-evaluator';
import { dirLangString } from '@comunica/utils-expression-evaluator/lib/functions/Helpers';

/**
 * https://www.w3.org/TR/sparql11-query/#func-lcase
 */
export class TermFunctionLcase extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.LCASE,
      overloads: declare(SparqlOperator.LCASE)
        .onString1Typed(() => lit => string(lit.toLowerCase()))
        .onLangString1(() => lit => langString(lit.typedValue.toLowerCase(), lit.language))
        .onDirLangString1(() => lit => dirLangString(lit.typedValue.toLowerCase(), lit.language, lit.direction))
        .collect(),
    });
  }
}
