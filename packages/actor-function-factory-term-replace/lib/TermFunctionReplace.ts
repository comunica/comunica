import { TermFunctionRegex } from '@comunica/actor-function-factory-term-regex';
import { TermFunctionBase } from '@comunica/bus-function-factory';
import type {
  StringLiteral,

  LangStringLiteral,
} from '@comunica/utils-expression-evaluator';
import {
  declare,
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
    super({
      arity: [ 3, 4 ],
      operator: SparqlOperator.REPLACE,
      overloads: declare(SparqlOperator.REPLACE)
        .onTernaryTyped(
          [ TypeURL.XSD_STRING, TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
          () => (arg: string, pattern: string, replacement: string) =>
            string(TermFunctionReplace.replace(arg, pattern, replacement)),
        )
        .set(
          [ TypeURL.RDF_LANG_STRING, TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
          () => ([ arg, pattern, replacement ]: [LangStringLiteral, StringLiteral, StringLiteral]) => {
            const result = TermFunctionReplace.replace(arg.typedValue, pattern.typedValue, replacement.typedValue);
            return langString(result, arg.language);
          },
        )
        .onQuaternaryTyped(
          [ TypeURL.XSD_STRING, TypeURL.XSD_STRING, TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
          () => (arg: string, pattern: string, replacement: string, flags: string) =>
            string(TermFunctionReplace.replace(arg, pattern, replacement, flags)),
        )
        .set(
          [ TypeURL.RDF_LANG_STRING, TypeURL.XSD_STRING, TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
          () => ([ arg, pattern, replacement, flags ]:
          [LangStringLiteral, StringLiteral, StringLiteral, StringLiteral]) => {
            const result = TermFunctionReplace.replace(
              arg.typedValue,
              pattern.typedValue,
              replacement.typedValue,
              flags.typedValue,
            );
            return langString(result, arg.language);
          },
        )
        .collect(),
    });
  }

  // https://www.w3.org/TR/xpath-functions/#func-replace
  private static replace(arg: string, pattern: string, replacement: string, flags = ''): string {
    flags = TermFunctionRegex.cleanFlags(flags);
    if (flags.includes('x')) {
      pattern = TermFunctionRegex.flagX(pattern);
    }
    if (flags.includes('q')) {
      pattern = TermFunctionRegex.flagQ(pattern);
    } else {
      replacement = replacement.replaceAll('$0', () => '$&');
    }
    flags = `${flags.replaceAll(/[qx]/gu, '')}g`;
    return arg.replaceAll(new RegExp(pattern, flags), replacement);
  }
}
