import { TermFunctionBase } from '@comunica/bus-function-factory';
import type {
  StringLiteral,

  LangStringLiteral,
} from '@comunica/expression-evaluator';
import {
  declare,
  langString,
  SparqlOperator,
  string,
  TypeURL,
} from '@comunica/expression-evaluator';

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

  // TODO: Fix flags
  // https://www.w3.org/TR/xpath-functions/#func-replace
  private static replace(arg: string, pattern: string, replacement: string, flags?: string): string {
    let reg = new RegExp(pattern, flags);
    if (!reg.global) {
      const flags_ = flags ?? '';
      reg = new RegExp(pattern, `${flags_}g`);
    }
    return arg.replace(reg, replacement);
  }
}
