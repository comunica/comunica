import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  bool,
  declare,
  SparqlOperator,
  TypeURL,
} from '@comunica/utils-expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-langMatches
 */
export class TermFunctionLangmatches extends TermFunctionBase {
  public constructor() {
    super({
      arity: 2,
      operator: SparqlOperator.LANG_MATCHES,
      overloads: declare(SparqlOperator.LANG_MATCHES)
        .onBinaryTyped(
          [ TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
          () => (tag: string, range: string) => bool(TermFunctionLangmatches.langMatches(tag, range)),
        ).collect(),
    });
  }

  // https://www.ietf.org/rfc/rfc4647.txt
  // https://www.w3.org/TR/sparql11-query/#func-langMatches
  private static langMatches(tag: string, range: string): boolean {
    const langTags = tag.split('-');
    const rangeTags = range.split('-');

    if (!TermFunctionLangmatches.matchLangTag(rangeTags[0], langTags[0]) &&
      !TermFunctionLangmatches.isWildCard(langTags[0])) {
      return false;
    }

    let lI = 1;
    let rI = 1;
    while (rI < rangeTags.length) {
      if (TermFunctionLangmatches.isWildCard(rangeTags[rI])) {
        rI++;
        continue;
      }
      if (lI === langTags.length) {
        return false;
      }
      if (TermFunctionLangmatches.matchLangTag(rangeTags[rI], langTags[lI])) {
        lI++;
        rI++;
        continue;
      }
      if (langTags[lI].length === 1) {
        return false;
      }
      lI++;
    }
    return true;
  }

  private static isWildCard(tag: string): boolean {
    return tag === '*';
  }

  private static matchLangTag(left: string, right: string): boolean {
    const matchInitial = new RegExp(`/${left}/`, 'iu');
    return matchInitial.test(`/${right}/`);
  }
}
