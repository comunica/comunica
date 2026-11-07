import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  SparqlOperator,
  string,
} from '@comunica/utils-expression-evaluator';

/**
 * Percent-encodes everything except the unreserved characters A-Z a-z 0-9 - _ . ~, as in fn:encode-for-uri.
 * encodeURIComponent leaves ! ' ( ) * unencoded, so those are encoded separately.
 */
function encodeForUri(value: string): string {
  return encodeURIComponent(value)
    .replaceAll(/[!'()*]/gu, char => `%${char.codePointAt(0)!.toString(16).toUpperCase()}`);
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-encode
 */
export class TermFunctionEncodeForUri extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.ENCODE_FOR_URI,
      overloads: declare(SparqlOperator.ENCODE_FOR_URI)
        .onStringly1Typed(() => val => string(encodeForUri(val))).collect(),
    });
  }
}
