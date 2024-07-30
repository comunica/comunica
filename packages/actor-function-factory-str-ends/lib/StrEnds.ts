import { RegularFunction } from '@comunica/bus-function-factory';
import type {

  LangStringLiteral,
} from '@comunica/expression-evaluator';
import {
  RegularOperator,
  TypeAlias,
  TypeURL,
  bool,
  declare,
  IncompatibleLanguageOperation,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-strends
 */
export class StrEnds extends RegularFunction {
  protected arity = 2;
  public operator = RegularOperator.STRENDS;

  protected overloads = declare(RegularOperator.STRENDS)
    .onBinaryTyped(
      [ TypeAlias.SPARQL_STRINGLY, TypeURL.XSD_STRING ],
      () => (arg1: string, arg2: string) => bool(arg1.endsWith(arg2)),
    )
    .onBinary(
      [ TypeURL.RDF_LANG_STRING, TypeURL.RDF_LANG_STRING ],
      () => (arg1: LangStringLiteral, arg2: LangStringLiteral) => {
        if (arg1.language !== arg2.language) {
          throw new IncompatibleLanguageOperation(arg1, arg2);
        }
        return bool(arg1.typedValue.endsWith(arg2.typedValue));
      },
    )
    .collect();
}
