import { TermFunctionBase } from '@comunica/bus-function-factory';
import type {

  LangStringLiteral,
} from '@comunica/utils-expression-evaluator';
import {
  bool,
  declare,
  IncompatibleLanguageOperation,
  SparqlOperator,
  TypeAlias,
  TypeURL,
} from '@comunica/utils-expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-strstarts
 * for this and the following functions you'll see (string, langstring) is not allowed. This behaviour is defined in:
 * https://www.w3.org/TR/sparql11-query/#func-arg-compatibility
 */
export class TermFunctionStrStarts extends TermFunctionBase {
  public constructor() {
    super({
      arity: 2,
      operator: SparqlOperator.STRSTARTS,
      overloads: declare(SparqlOperator.STRSTARTS)
        .onBinaryTyped(
          [ TypeAlias.SPARQL_STRINGLY, TypeURL.XSD_STRING ],
          () => (arg1: string, arg2: string) => bool(arg1.startsWith(arg2)),
        )
        .onBinary(
          [ TypeURL.RDF_LANG_STRING, TypeURL.RDF_LANG_STRING ],
          () => (arg1: LangStringLiteral, arg2: LangStringLiteral) => {
            if (arg1.language !== arg2.language) {
              throw new IncompatibleLanguageOperation(arg1, arg2);
            }
            return bool(arg1.typedValue.startsWith(arg2.typedValue));
          },
        )
        .collect(),
    });
  }
}
