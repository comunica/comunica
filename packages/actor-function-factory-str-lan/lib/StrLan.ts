import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  TypeURL,
  declare,
  LangStringLiteral,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-strlang
 */
export class StrLan extends RegularFunction {
  protected arity = 2;
  public operator = RegularOperator.STRLANG;

  protected overloads = declare(RegularOperator.STRLANG)
    .onBinaryTyped(
      [ TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
      () => (val: string, language: string) => new LangStringLiteral(val, language.toLowerCase()),
    )
    .collect();
}
