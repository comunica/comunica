import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  langString,
  SparqlOperator,
  string,
} from '@comunica/utils-expression-evaluator';
import { dirLangString } from '@comunica/utils-expression-evaluator/lib/functions/Helpers';

/**
 * https://www.w3.org/TR/sparql11-query/#func-ucase
 */
export class TermFunctionUcase extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.UCASE,
      overloads: declare(SparqlOperator.UCASE)
        .onString1Typed(() => lit => string(lit.toUpperCase()))
        .onLangString1(() => lit => langString(lit.typedValue.toUpperCase(), lit.language))
        .onDirLangString1(() => lit => dirLangString(lit.typedValue.toUpperCase(), lit.language, lit.direction))
        .collect(),
    });
  }
}
