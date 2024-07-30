import { RegularFunction } from '@comunica/bus-function-factory';

import {
  RegularOperator,
  TypeURL,
  bool,
  declare,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-langMatches
 */
export class Langmatches extends RegularFunction {
  protected arity = 2;
  public operator = RegularOperator.LANG_MATCHES;

  // TODO: Not an XPath function
  // TODO: Publish as package
  // https://www.ietf.org/rfc/rfc4647.txt
  // https://www.w3.org/TR/sparql11-query/#func-langMatches
  private static langMatches(tag: string, range: string): boolean {
    const langTags = tag.split('-');
    const rangeTags = range.split('-');

    if (!Langmatches.matchLangTag(rangeTags[0], langTags[0]) &&
      !Langmatches.isWildCard(langTags[0])) {
      return false;
    }

    let lI = 1;
    let rI = 1;
    while (rI < rangeTags.length) {
      if (Langmatches.isWildCard(rangeTags[rI])) {
        rI++;
        continue;
      }
      if (lI === langTags.length) {
        return false;
      }
      if (Langmatches.matchLangTag(rangeTags[rI], langTags[lI])) {
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

  protected overloads = declare(RegularOperator.LANG_MATCHES)
    .onBinaryTyped(
      [ TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
      () => (tag: string, range: string) => bool(Langmatches.langMatches(tag, range)),
    ).collect();
}
