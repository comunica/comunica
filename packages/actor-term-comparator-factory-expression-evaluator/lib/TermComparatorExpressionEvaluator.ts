import type { InternalEvaluator } from '@comunica/actor-expression-evaluator-factory-default/lib/InternalEvaluator';
import type { ITermFunction } from '@comunica/bus-function-factory';
import type { ITermComparator } from '@comunica/bus-term-comparator-factory';
import type * as Eval from '@comunica/utils-expression-evaluator';
import type * as RDF from '@rdfjs/types';

export class TermComparatorExpressionEvaluator implements ITermComparator {
  public constructor(
    private readonly internalEvaluator: InternalEvaluator,
    private readonly lessThanFunction: ITermFunction,
  ) {}

  // Determine the relative numerical order of the two given terms.
  // In accordance with https://www.w3.org/TR/sparql11-query/#modOrderBy
  public orderTypes(termA: RDF.Term | undefined, termB: RDF.Term | undefined): -1 | 0 | 1 {
    // Check if terms are the same by reference
    if (termA === termB) {
      return 0;
    }

    // We handle undefined that is lower than everything else.
    if (termA === undefined) {
      return -1;
    }
    if (termB === undefined) {
      return 1;
    }

    const myTermA: Eval.Term = this.internalEvaluator.transformer.transformRDFTermUnsafe(termA);
    const myTermB: Eval.Term = this.internalEvaluator.transformer.transformRDFTermUnsafe(termB);

    try {
      if ((<Eval.BooleanLiteral> this.lessThanFunction.applyOnTerms([ myTermA, myTermB ], this.internalEvaluator))
        .typedValue) {
        return -1;
      }
      if ((<Eval.BooleanLiteral> this.lessThanFunction.applyOnTerms([ myTermB, myTermA ], this.internalEvaluator))
        .typedValue) {
        return 1;
      }
      return 0;
    } catch {
      // Fallback to string-based comparison
      return this.comparePrimitives(myTermA.str(), myTermB.str());
    }
  }

  private comparePrimitives(valueA: any, valueB: any): -1 | 0 | 1 {
    return valueA === valueB ? 0 : (valueA < valueB ? -1 : 1);
  }
}
