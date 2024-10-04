import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  NamedNode,
  SparqlOperator,
} from '@comunica/expression-evaluator';
import * as uuid from 'uuid';

/**
 * https://www.w3.org/TR/sparql11-query/#func-uuid
 */
export class TermFunctionUuid extends TermFunctionBase {
  public constructor() {
    super({
      arity: 0,
      operator: SparqlOperator.UUID,
      overloads: declare(SparqlOperator.UUID)
        .set([], () => () => new NamedNode(`urn:uuid:${uuid.v4()}`))
        .collect(),
    });
  }
}
