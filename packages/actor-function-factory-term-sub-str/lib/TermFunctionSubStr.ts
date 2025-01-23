import { TermFunctionBase } from '@comunica/bus-function-factory';
import type {
  NumericLiteral,

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
 * https://www.w3.org/TR/sparql11-query/#func-substr
 */
export class TermFunctionSubStr extends TermFunctionBase {
  public constructor() {
    super({
      arity: [ 2, 3 ],
      operator: SparqlOperator.SUBSTR,
      overloads: declare(SparqlOperator.SUBSTR)
        .onBinaryTyped(
          [ TypeURL.XSD_STRING, TypeURL.XSD_INTEGER ],
          () => (source: string, startingLoc: number) => string([ ...source ].slice(startingLoc - 1).join('')),
        )
        .onBinary(
          [ TypeURL.RDF_LANG_STRING, TypeURL.XSD_INTEGER ],
          () => (source: LangStringLiteral, startingLoc: NumericLiteral) => {
            const sub = [ ...source.typedValue ].slice(startingLoc.typedValue - 1).join('');
            return langString(sub, source.language);
          },
        )
        .onBinary(
          [ TypeURL.RDF_DIR_LANG_STRING, TypeURL.XSD_INTEGER ],
          () => (source: DirLangStringLiteral, startingLoc: NumericLiteral) => {
            const sub = [ ...source.typedValue ].slice(startingLoc.typedValue - 1).join('');
            return dirLangString(sub, source.language, source.direction);
          },
        )
        .onTernaryTyped(
          [ TypeURL.XSD_STRING, TypeURL.XSD_INTEGER, TypeURL.XSD_INTEGER ],
          () => (source: string, startingLoc: number, length: number) =>
            string([ ...source ].slice(startingLoc - 1, length + startingLoc - 1).join('')),
        )
        .onTernary(
          [ TypeURL.RDF_LANG_STRING, TypeURL.XSD_INTEGER, TypeURL.XSD_INTEGER ],
          () => (source: LangStringLiteral, startingLoc: NumericLiteral, length: NumericLiteral) => {
            const sub = [ ...source.typedValue ]
              .slice(startingLoc.typedValue - 1, length.typedValue + startingLoc.typedValue - 1)
              .join('');
            return langString(sub, source.language);
          },
        )
        .onTernary(
          [ TypeURL.RDF_DIR_LANG_STRING, TypeURL.XSD_INTEGER, TypeURL.XSD_INTEGER ],
          () => (source: DirLangStringLiteral, startingLoc: NumericLiteral, length: NumericLiteral) => {
            const sub = [ ...source.typedValue ]
              .slice(startingLoc.typedValue - 1, length.typedValue + startingLoc.typedValue - 1)
              .join('');
            return dirLangString(sub, source.language, source.direction);
          },
        )
        .collect(),
    });
  }
}
