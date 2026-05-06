import { TermFunctionBase } from '@comunica/bus-function-factory';
import type {

  LangStringLiteral,
} from '@comunica/utils-expression-evaluator';
import {
  declare,
  langString,
  SparqlOperator,
  string,
  TypeURL,
} from '@comunica/utils-expression-evaluator';
import type { DirLangStringLiteral } from '@comunica/utils-expression-evaluator/lib/expressions';
import { dirLangString } from '@comunica/utils-expression-evaluator/lib/functions/Helpers';

/**
 * https://www.w3.org/TR/sparql11-query/#func-strbefore
 */
export class TermFunctionStrBefore extends TermFunctionBase {
  public constructor() {
    super({
      arity: 2,
      operator: SparqlOperator.STRBEFORE,
      overloads: declare(SparqlOperator.STRBEFORE)
        .onCompatibleStringly2(() => (arg1, arg2) => {
          const [ a1, a2 ] = [ arg1.typedValue, arg2.typedValue ];
          const sub = a1.slice(0, Math.max(0, a1.indexOf(a2)));
          if (sub || !a2) {
            if (arg1.dataType === TypeURL.RDF_LANG_STRING) {
              return langString(sub, (<LangStringLiteral> arg1).language);
            }
            if (arg1.dataType === TypeURL.RDF_DIR_LANG_STRING) {
              return dirLangString(
                sub,
                (<DirLangStringLiteral> arg1).language,
                (<DirLangStringLiteral> arg1).direction,
              );
            }
            return string(sub, arg1.dataType);
          }
          return string(sub);
        })
        .collect(),
    });
  }
}
