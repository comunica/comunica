import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  ExpressionError,
  LangStringLiteral,
  SparqlOperator,
  TypeURL,
} from '@comunica/utils-expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-strlang
 */
export class TermFunctionStrLang extends TermFunctionBase {
  public constructor() {
    super({
      arity: 2,
      operator: SparqlOperator.STRLANG,
      overloads: declare(SparqlOperator.STRLANG)
        .onBinaryTyped(
          [ TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
          () => (val: string, language: string) => {
            if (!language) {
              throw new ExpressionError(`Unable to create language string for empty languages`);
            }
            return new LangStringLiteral(val, language.toLowerCase());
          },
        )
        .collect(),
    });
  }
}
