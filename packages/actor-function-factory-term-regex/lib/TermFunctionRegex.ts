import { TermFunctionBase } from '@comunica/bus-function-factory';
import type {
  BooleanLiteral,
} from '@comunica/utils-expression-evaluator';
import {
  bool,
  declare,
  SparqlOperator,
  TypeAlias,
  TypeURL,
} from '@comunica/utils-expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-regex
 */
export class TermFunctionRegex extends TermFunctionBase {
  public constructor() {
    super({
      arity: [ 2, 3 ],
      operator: SparqlOperator.REGEX,
      overloads: declare(SparqlOperator.REGEX)
        .onBinaryTyped([ TypeAlias.SPARQL_STRINGLY, TypeURL.XSD_STRING ], TermFunctionRegex.regex2)
        .onTernaryTyped([ TypeAlias.SPARQL_STRINGLY, TypeURL.XSD_STRING, TypeURL.XSD_STRING ], TermFunctionRegex.regex3)
        .collect(),
    });
  }

  private static regex2(): (text: string, pattern: string) => BooleanLiteral {
    return (text: string, pattern: string) => bool(TermFunctionRegex.matches(text, pattern));
  }

  private static regex3(): (text: string, pattern: string, flags: string) => BooleanLiteral {
    return (text: string, pattern: string, flags: string) => bool(TermFunctionRegex.matches(text, pattern, flags));
  }

  // https://www.w3.org/TR/xpath-functions/#func-matches
  // https://www.w3.org/TR/xpath-functions/#flags
  private static matches(text: string, pattern: string, flags = ''): boolean {
    // Flags:
    //   i: case-insensitive: same as the 'i' flag in JavaScript
    //   m: multi-line mode: same as the 'm' flag in JavaScript
    //   s: dot-all mode: matches 's' flag in JavaScript very well.
    //   x: whitespace characters (#x9, #xA, #xD and #x20)
    //      in the regular expression are removed prior to matching with one exception:
    //        whitespace characters within character class expressions.
    //   q: regex-no-metacharacters:
    //      all characters in the regular expression are treated as representing themselves, not as metacharacters
    //      If it is used together with the m, s, or x flag, that flag has no effect.
    flags = TermFunctionRegex.cleanFlags(flags);
    if (flags.includes('x')) {
      pattern = TermFunctionRegex.flagX(pattern);
    }
    if (flags.includes('q')) {
      pattern = TermFunctionRegex.flagQ(pattern);
    }
    const reg = new RegExp(pattern, flags.replaceAll(/[qx]/gu, ''));
    return reg.test(text);
  }

  public static cleanFlags(flags: string): string {
    // Check flag validity
    if (!/^[imsxq]*$/u.test(flags)) {
      throw new Error('Invalid flags');
    }
    const duplicateFlag = [ ...flags ]
      .find((value, index, self) => self.indexOf(value) !== index);
    if (duplicateFlag) {
      throw new Error(`Duplicate flag: ${duplicateFlag}`);
    }
    // If the 'q' flag is used, the 'm', 's', and 'x' flags have no effect
    if (flags?.includes('q')) {
      flags = flags.replaceAll(/[msx]/gu, '');
    }
    // Add the JS 'u' flag to the flags to allow for safer regex execution.
    // See reasons given by [ESLint](https://eslint.org/docs/latest/rules/require-unicode-regexp).
    // Disable [Annex B](https://262.ecma-international.org/6.0/#sec-regular-expressions-patterns)
    return `${flags}u`;
  }

  public static flagX(pattern: string): string {
    if (!pattern) {
      return pattern;
    }
    // Remove all spaces in the pattern, excluding those in character classes
    let prev = pattern[0];
    while ([ '\u0009', '\u000A', '\u000D', '\u0020' ].includes(prev)) {
      pattern = pattern.slice(1);
      prev = pattern[0];
    }
    let inClass = prev === '[';
    for (let i = 1; i < pattern.length; i++) {
      const c = pattern[i];
      if ([ '\u0009', '\u000A', '\u000D', '\u0020' ].includes(c) && !inClass) {
        pattern = pattern.slice(0, i) + pattern.slice(i + 1);
        i--;
      } else if (c === '[' && prev !== '\\') {
        inClass = true;
      } else if (c === ']' && prev !== '\\') {
        inClass = false;
      }
      prev = c;
    }
    return pattern;
  }

  public static flagQ(pattern: string): string {
    // Escape all metacharacters in the pattern
    return pattern
      .replaceAll(/([?+*.{}()[\]\\|])/gu, '\\$1')
      .replaceAll(/^\^/gu, '\\^')
      .replaceAll(/\$$/gu, '\\$');
  }
}
