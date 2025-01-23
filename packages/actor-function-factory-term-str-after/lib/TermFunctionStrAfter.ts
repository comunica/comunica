import { TermFunctionBase } from '@comunica/bus-function-factory';
import type {
  StringLiteral,

  LangStringLiteral,
} from '@comunica/utils-expression-evaluator';
import {
  declare,
  IncompatibleLanguageOperation,
  langString,
  SparqlOperator,
  string,
  TypeURL,
} from '@comunica/utils-expression-evaluator';
import type { DirLangStringLiteral } from '@comunica/utils-expression-evaluator/lib/expressions';
import { dirLangString } from '@comunica/utils-expression-evaluator/lib/functions/Helpers';
import { IncompatibleDirectionalLanguageOperation } from '@comunica/utils-expression-evaluator/lib/util/Errors';

/**
 * https://www.w3.org/TR/sparql11-query/#func-strafter
 */
export class TermFunctionStrAfter extends TermFunctionBase {
  public constructor() {
    super({
      arity: 2,
      operator: SparqlOperator.STRAFTER,
      overloads: declare(SparqlOperator.STRAFTER)
        .onBinaryTyped(
          [ TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
          () => (arg1: string, arg2: string) => string(arg1.slice(arg1.indexOf(arg2)).slice(arg2.length)),
        )
        .onBinary(
          [ TypeURL.RDF_LANG_STRING, TypeURL.XSD_STRING ],
          () => (arg1: LangStringLiteral, arg2: StringLiteral) => {
            const [ a1, a2 ] = [ arg1.typedValue, arg2.typedValue ];
            const sub = a1.slice(a1.indexOf(a2)).slice(a2.length);
            return sub || !a2 ? langString(sub, arg1.language) : string(sub);
          },
        )
        .onBinary(
          [ TypeURL.RDF_LANG_STRING, TypeURL.RDF_LANG_STRING ],
          () => (arg1: LangStringLiteral, arg2: LangStringLiteral) => {
            if (arg1.language !== arg2.language) {
              throw new IncompatibleLanguageOperation(arg1, arg2);
            }
            const [ a1, a2 ] = [ arg1.typedValue, arg2.typedValue ];
            const sub = a1.slice(a1.indexOf(a2)).slice(a2.length);
            return sub || !a2 ? langString(sub, arg1.language) : string(sub);
          },
        )
        .onBinary(
          [ TypeURL.RDF_DIR_LANG_STRING, TypeURL.XSD_STRING ],
          () => (arg1: DirLangStringLiteral, arg2: StringLiteral) => {
            const [ a1, a2 ] = [ arg1.typedValue, arg2.typedValue ];
            const sub = a1.slice(a1.indexOf(a2)).slice(a2.length);
            return sub || !a2 ? dirLangString(sub, arg1.language, arg1.direction) : string(sub);
          },
        )
        .onBinary(
          [ TypeURL.RDF_DIR_LANG_STRING, TypeURL.RDF_LANG_STRING ],
          () => (arg1: DirLangStringLiteral, arg2: LangStringLiteral) => {
            if (arg1.language !== arg2.language) {
              throw new IncompatibleLanguageOperation(arg1, arg2);
            }
            const [ a1, a2 ] = [ arg1.typedValue, arg2.typedValue ];
            const sub = a1.slice(a1.indexOf(a2)).slice(a2.length);
            return sub || !a2 ? dirLangString(sub, arg1.language, arg1.direction) : string(sub);
          },
        )
        .onBinary(
          [ TypeURL.RDF_DIR_LANG_STRING, TypeURL.RDF_DIR_LANG_STRING ],
          () => (arg1: DirLangStringLiteral, arg2: DirLangStringLiteral) => {
            if (arg1.language !== arg2.language) {
              throw new IncompatibleLanguageOperation(arg1, arg2);
            }
            if (arg1.direction !== arg2.direction) {
              throw new IncompatibleDirectionalLanguageOperation(arg1, arg2);
            }
            const [ a1, a2 ] = [ arg1.typedValue, arg2.typedValue ];
            const sub = a1.slice(a1.indexOf(a2)).slice(a2.length);
            return sub || !a2 ? dirLangString(sub, arg1.language, arg1.direction) : string(sub);
          },
        )
        .collect(),
    });
  }
}
