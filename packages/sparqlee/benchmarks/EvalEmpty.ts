import { Literal } from 'rdf-js';
import { Expression } from 'sparqljs';

import { Bindings, IEvaluator } from '../src/core/FilteredStreams';

/**
 * Benchmarking this provides a (very lose) theoretical maximum
 */
export class EmptyEvaluator implements IEvaluator {
  private expr: Expression;

  constructor(expr: Expression) {
    this.expr = expr;
  }

  public evaluate(mapping: Bindings): boolean {
    return null;
  }
}
