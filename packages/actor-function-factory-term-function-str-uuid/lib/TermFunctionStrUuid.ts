import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  SparqlOperator,
  string,
} from '@comunica/utils-expression-evaluator';
import * as uuid from 'uuid';

/**
 * https://www.w3.org/TR/sparql11-query/#func-struuid
 */
export class TermFunctionStrUuid extends TermFunctionBase {
  public constructor() {
    super({
      arity: 0,
      operator: SparqlOperator.STRUUID,
      overloads: declare(SparqlOperator.STRUUID)
        .set([], () => () => string(uuid.v4()))
        .collect(),
    });
  }
}
