import { TermFunctionBase } from '@comunica/bus-function-factory';
import type { DirLangStringLiteral, LangStringLiteral, NumericLiteral } from '@comunica/utils-expression-evaluator';
import {
  declare,
  dirLangString,
  langString,
  SparqlOperator,
  string,
  TypeURL,
} from '@comunica/utils-expression-evaluator';

/**
 * Characters at 1-based position p with start <= p < start + length, as in fn:substring.
 * Positions before the string start are ignored, so no negative slice indices are produced.
 */
function substring(source: string, start: number, length?: number): string {
  const chars = [ ...source ];
  const begin = Math.max(start - 1, 0);
  if (length === undefined) {
    return chars.slice(begin).join('');
  }
  return chars.slice(begin, Math.max(start - 1 + length, 0)).join('');
}

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
          () => (source: string, startingLoc: number) => string(substring(source, startingLoc)),
        )
        .onBinary(
          [ TypeURL.RDF_LANG_STRING, TypeURL.XSD_INTEGER ],
          () => (source: LangStringLiteral, startingLoc: NumericLiteral) => {
            const sub = substring(source.typedValue, startingLoc.typedValue);
            return langString(sub, source.language);
          },
        )
        .onBinary(
          [ TypeURL.RDF_DIR_LANG_STRING, TypeURL.XSD_INTEGER ],
          () => (source: DirLangStringLiteral, startingLoc: NumericLiteral) => {
            const sub = substring(source.typedValue, startingLoc.typedValue);
            return dirLangString(sub, source.language, source.direction);
          },
        )
        .onTernaryTyped(
          [ TypeURL.XSD_STRING, TypeURL.XSD_INTEGER, TypeURL.XSD_INTEGER ],
          () => (source: string, startingLoc: number, length: number) =>
            string(substring(source, startingLoc, length)),
        )
        .onTernary(
          [ TypeURL.RDF_LANG_STRING, TypeURL.XSD_INTEGER, TypeURL.XSD_INTEGER ],
          () => (source: LangStringLiteral, startingLoc: NumericLiteral, length: NumericLiteral) => {
            const sub = substring(source.typedValue, startingLoc.typedValue, length.typedValue);
            return langString(sub, source.language);
          },
        )
        .onTernary(
          [ TypeURL.RDF_DIR_LANG_STRING, TypeURL.XSD_INTEGER, TypeURL.XSD_INTEGER ],
          () => (source: DirLangStringLiteral, startingLoc: NumericLiteral, length: NumericLiteral) => {
            const sub = substring(source.typedValue, startingLoc.typedValue, length.typedValue);
            return dirLangString(sub, source.language, source.direction);
          },
        )
        .collect(),
    });
  }
}
