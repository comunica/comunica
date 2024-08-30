import { TermFunctionBase } from '@comunica/bus-function-factory';
import type {

  LangStringLiteral,
} from '@comunica/expression-evaluator';
import {
  bool,
  declare,
  IncompatibleLanguageOperation,
  SparqlOperator,
  TypeAlias,
  TypeURL,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-contains
 */
export class TermFunctionContains extends TermFunctionBase {
  public constructor() {
    super({
      arity: 2,
      operator: SparqlOperator.CONTAINS,
      overloads: declare(SparqlOperator.CONTAINS)
        .onBinaryTyped(
          [ TypeAlias.SPARQL_STRINGLY, TypeURL.XSD_STRING ],
          () => (arg1: string, arg2: string) => bool(arg1.includes(arg2)),
        )
        .onBinary(
          [ TypeURL.RDF_LANG_STRING, TypeURL.RDF_LANG_STRING ],
          () => (arg1: LangStringLiteral, arg2: LangStringLiteral) => {
            if (arg1.language !== arg2.language) {
              throw new IncompatibleLanguageOperation(arg1, arg2);
            }
            return bool(arg1.typedValue.includes(arg2.typedValue));
          },
        )
        .collect(),
    });
  }
}
