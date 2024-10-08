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

  // https://www.w3.org/TR/xpath-functions/#func-matches
  // https://www.w3.org/TR/xpath-functions/#flags
  private static matches(text: string, pattern: string, flags?: string): boolean {
    // TODO: Only flags 'i' and 'm' match between XPath and JS.
    // 's', 'x', 'q', would need proper implementation.
    const reg = new RegExp(pattern, flags);
    return reg.test(text);
  }

  private static regex2(): (text: string, pattern: string) => BooleanLiteral {
    return (text: string, pattern: string) => bool(TermFunctionRegex.matches(text, pattern));
  }

  private static regex3(): (text: string, pattern: string, flags: string) => BooleanLiteral {
    return (text: string, pattern: string, flags: string) => bool(TermFunctionRegex.matches(text, pattern, flags));
  }
}
