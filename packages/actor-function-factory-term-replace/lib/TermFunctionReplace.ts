import { TermFunctionRegex } from '@comunica/actor-function-factory-term-regex';
import { TermFunctionBase } from '@comunica/bus-function-factory';
import type { DirLangStringLiteral, LangStringLiteral, StringLiteral } from '@comunica/utils-expression-evaluator';
import {
  declare,
  dirLangString,
  ExpressionError,
  langString,
  SparqlOperator,
  string,
  TypeURL,
} from '@comunica/utils-expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-replace
 */
export class TermFunctionReplace extends TermFunctionBase {
  public constructor() {
    const replace = TermFunctionReplace.createReplace();
    super({
      arity: [ 3, 4 ],
      operator: SparqlOperator.REPLACE,
      overloads: declare(SparqlOperator.REPLACE)
        .onTernaryTyped(
          [ TypeURL.XSD_STRING, TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
          () => (arg: string, pattern: string, replacement: string) =>
            string(replace(arg, pattern, replacement)),
        )
        .set(
          [ TypeURL.RDF_LANG_STRING, TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
          () => ([ arg, pattern, replacement ]: [LangStringLiteral, StringLiteral, StringLiteral]) => {
            const result = replace(arg.typedValue, pattern.typedValue, replacement.typedValue);
            return langString(result, arg.language);
          },
        )
        .set(
          [ TypeURL.RDF_DIR_LANG_STRING, TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
          () => ([ arg, pattern, replacement ]: [DirLangStringLiteral, StringLiteral, StringLiteral]) => {
            const result = replace(arg.typedValue, pattern.typedValue, replacement.typedValue);
            return dirLangString(result, arg.language, arg.direction);
          },
        )
        .onQuaternaryTyped(
          [ TypeURL.XSD_STRING, TypeURL.XSD_STRING, TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
          () => (arg: string, pattern: string, replacement: string, flags: string) =>
            string(replace(arg, pattern, replacement, flags)),
        )
        .set(
          [ TypeURL.RDF_LANG_STRING, TypeURL.XSD_STRING, TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
          () => ([ arg, pattern, replacement, flags ]:
          [LangStringLiteral, StringLiteral, StringLiteral, StringLiteral]) => {
            const result = replace(
              arg.typedValue,
              pattern.typedValue,
              replacement.typedValue,
              flags.typedValue,
            );
            return langString(result, arg.language);
          },
        )
        .set(
          [ TypeURL.RDF_DIR_LANG_STRING, TypeURL.XSD_STRING, TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
          () => ([ arg, pattern, replacement, flags ]:
          [DirLangStringLiteral, StringLiteral, StringLiteral, StringLiteral]) => {
            const result = replace(
              arg.typedValue,
              pattern.typedValue,
              replacement.typedValue,
              flags.typedValue,
            );
            return dirLangString(result, arg.language, arg.direction);
          },
        )
        .collect(),
    });
  }

  /**
   * Creates an fn:replace implementation that reuses the compilation of the previous call
   * if it had the same pattern, replacement, and flags, as these are usually constant within an expression.
   * https://www.w3.org/TR/xpath-functions/#func-replace
   */
  public static createReplace(): (arg: string, pattern: string, replacement: string, flags?: string) => string {
    let lastPattern: string | undefined;
    let lastReplacement: string | undefined;
    let lastFlags: string | undefined;
    let compiled: ICompiledReplace;
    return (arg: string, pattern: string, replacement: string, flags = ''): string => {
      if (pattern !== lastPattern || replacement !== lastReplacement || flags !== lastFlags) {
        compiled = TermFunctionReplace.compile(pattern, replacement, flags);
        lastPattern = pattern;
        lastReplacement = replacement;
        lastFlags = flags;
      }
      const { regex, replacer } = compiled;
      return typeof replacer === 'string' ? arg.replaceAll(regex, replacer) : arg.replaceAll(regex, replacer);
    };
  }

  /**
   * Converts fn:replace arguments into arguments for String.prototype.replaceAll.
   * @param pattern An fn:replace pattern.
   * @param replacement An fn:replace replacement string.
   * @param flags fn:replace flags.
   */
  public static compile(pattern: string, replacement: string, flags: string): ICompiledReplace {
    flags = TermFunctionRegex.cleanFlags(flags);
    if (flags.includes('x')) {
      pattern = TermFunctionRegex.flagX(pattern);
    }
    const literal = flags.includes('q');
    if (literal) {
      pattern = TermFunctionRegex.flagQ(pattern);
    }
    flags = flags.replaceAll(/[qx]/gu, '');
    const regex = new RegExp(pattern, `${flags}g`);

    // With the 'q' flag, the replacement is used as-is.
    if (literal) {
      return { regex, replacer: TermFunctionReplace.escapeJsReplacement(replacement) };
    }
    const { literals, references } = TermFunctionReplace.parseReplacement(replacement);
    if (references.length === 0) {
      return { regex, replacer: TermFunctionReplace.escapeJsReplacement(literals[0]) };
    }

    const groupCount = TermFunctionReplace.countGroups(pattern);
    const groups = references.map((digits, i) => {
      const [ group, trailing ] = TermFunctionReplace.resolveGroupReference(digits, groupCount);
      literals[i + 1] = trailing + literals[i + 1];
      return group;
    });

    // JS replacement strings are fastest, but can only refer to the first 99 groups.
    if (groups.every(group => group < 100)) {
      let replacer = TermFunctionReplace.escapeJsReplacement(literals[0]);
      for (const [ i, group ] of groups.entries()) {
        // Two digits are always used, so a following literal digit is never read as part of the reference.
        const reference = group === 0 ? '$&' : `$${String(group).padStart(2, '0')}`;
        replacer += (group < 0 ? '' : reference) + TermFunctionReplace.escapeJsReplacement(literals[i + 1]);
      }
      return { regex, replacer };
    }
    // With more than 99 groups, a group index is never -1, as that requires fewer than 9 groups.
    return {
      regex,
      replacer(...args: unknown[]): string {
        let result = literals[0];
        for (const [ i, group ] of groups.entries()) {
          result += (<string | undefined> args[group] ?? '') + literals[i + 1];
        }
        return result;
      },
    };
  }

  /**
   * Splits an fn:replace replacement string into literal parts and the digits of '$' references,
   * where literals[i] precedes references[i].
   * @param replacement An fn:replace replacement string.
   */
  public static parseReplacement(replacement: string): { literals: string[]; references: string[] } {
    const literals: string[] = [];
    const references: string[] = [];
    let literal = '';
    for (let i = 0; i < replacement.length; i++) {
      const char = replacement[i];
      if (char === '\\') {
        const next = replacement[i + 1];
        if (next !== '\\' && next !== '$') {
          throw new ExpressionError(`Invalid replacement string '${replacement}': '\\' must be followed by '\\' or '$'`);
        }
        literal += next;
        i++;
      } else if (char === '$') {
        let end = i + 1;
        while (end < replacement.length && replacement[end] >= '0' && replacement[end] <= '9') {
          end++;
        }
        if (end === i + 1) {
          throw new ExpressionError(`Invalid replacement string '${replacement}': '$' must be followed by a digit`);
        }
        literals.push(literal);
        references.push(replacement.slice(i + 1, end));
        literal = '';
        i = end - 1;
      } else {
        literal += char;
      }
    }
    literals.push(literal);
    return { literals, references };
  }

  /**
   * Counts the capturing groups in a valid JS regular expression with the 'u' flag.
   * @param pattern A JS regular expression pattern.
   */
  public static countGroups(pattern: string): number {
    let count = 0;
    let inClass = false;
    for (let i = 0; i < pattern.length; i++) {
      const char = pattern[i];
      if (char === '\\') {
        i++;
      } else if (inClass) {
        inClass = char !== ']';
      } else if (char === '[') {
        inClass = true;
      } else if (char === '(' && (pattern[i + 1] !== '?' ||
        // Named groups are capturing, unlike lookbehind assertions.
        (pattern[i + 2] === '<' && pattern[i + 3] !== '=' && pattern[i + 3] !== '!'))) {
        count++;
      }
    }
    return count;
  }

  /**
   * Resolves the digits following a '$' in an fn:replace replacement string.
   * @param digits The digits following the '$'.
   * @param groupCount The number of capturing groups in the pattern.
   * @return The group to insert (0 for the whole match, -1 for the empty string),
   *         and the trailing digits to insert literally.
   */
  public static resolveGroupReference(digits: string, groupCount: number): [ number, string ] {
    let end = digits.length;
    let index = Number(digits);
    // If N > S and N > 9, the last digit of N is literal, and the rules are reapplied.
    while (index > groupCount && index > 9) {
      end--;
      index = Number(digits.slice(0, end));
    }
    // If S < N <= 9, the empty string is inserted.
    return [ index > groupCount ? -1 : index, digits.slice(end) ];
  }

  /**
   * Escapes a string so that String.prototype.replaceAll inserts it as-is.
   */
  private static escapeJsReplacement(replacement: string): string {
    return replacement.includes('$') ? replacement.replaceAll('$', () => '$$') : replacement;
  }
}

/**
 * The arguments for String.prototype.replaceAll that implement an fn:replace call.
 */
export interface ICompiledReplace {
  regex: RegExp;
  replacer: string | ((...args: unknown[]) => string);
}
