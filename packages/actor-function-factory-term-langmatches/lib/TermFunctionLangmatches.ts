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

  /**
   * Basic filtering as defined in https://www.rfc-editor.org/rfc/rfc4647#section-3.3.1:
   * the range matches if it equals the tag, or a prefix of the tag that is followed by '-',
   * comparing case-insensitively. The range '*' matches any non-empty tag.
   * @param tag A language tag, or the empty string for literals without language.
   * @param range A basic language range.
   */
  public static langMatches(tag: string, range: string): boolean {
    if (tag.length === 0) {
      return false;
    }
    if (range === '*') {
      return true;
    }
    if (tag.length !== range.length && (tag.length < range.length || tag.codePointAt(range.length) !== 0x2D)) {
      return false;
    }
    for (let i = 0; i < range.length; i++) {
      const a = tag.codePointAt(i)!;
      const b = range.codePointAt(i)!;
      // Language tags are ASCII, so only ASCII letters are compared case-insensitively.
      if (a !== b && TermFunctionLangmatches.asciiLowerCase(a) !== TermFunctionLangmatches.asciiLowerCase(b)) {
        return false;
      }
    }
    return true;
  }

  private static asciiLowerCase(code: number): number {
    return code >= 0x41 && code <= 0x5A ? code + 0x20 : code;
  }
}
