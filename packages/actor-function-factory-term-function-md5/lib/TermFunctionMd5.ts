import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  SparqlOperator,
  string,
} from '@comunica/expression-evaluator';
import { hash as md5 } from 'spark-md5';

/**
 * https://www.w3.org/TR/sparql11-query/#func-md5
 */
export class TermFunctionMd5 extends TermFunctionBase {
  public constructor() {
    super({
      arity: 1,
      operator: SparqlOperator.MD5,
      overloads: declare(SparqlOperator.MD5)
        .onString1Typed(() => str => string(md5(str)))
        .collect(),
    });
  }
}
