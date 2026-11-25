import { TermFunctionBase } from '@comunica/bus-function-factory';

import {
  declare,
  NamedNode,
  SparqlOperator,
  uuidv4,
} from '@comunica/utils-expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-uuid
 */
export class TermFunctionUuid extends TermFunctionBase {
  public constructor() {
    super({
      arity: 0,
      operator: SparqlOperator.UUID,
      overloads: declare(SparqlOperator.UUID)
        .set([], () => () => new NamedNode(`urn:uuid:${uuidv4()}`))
        .collect(),
    });
  }
}
