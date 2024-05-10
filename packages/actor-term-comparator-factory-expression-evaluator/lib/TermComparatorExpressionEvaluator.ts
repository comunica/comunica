import type { InternalEvaluator } from '@comunica/actor-expression-evaluator-factory-default/lib/InternalEvaluator';
import type { ITermFunction } from '@comunica/bus-function-factory';
import type { ITermComparator } from '@comunica/bus-term-comparator-factory';
import type * as E from '@comunica/expression-evaluator/lib/expressions';
import type * as RDF from '@rdfjs/types';

export class TermComparatorExpressionEvaluator implements ITermComparator {
  public constructor(
    private readonly internalEvaluator: InternalEvaluator,
    private readonly equalityFunction: ITermFunction,
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

    //
    if (termA.termType !== termB.termType) {
      return this._TERM_ORDERING_PRIORITY[termA.termType] < this._TERM_ORDERING_PRIORITY[termB.termType] ? -1 : 1;
    }

    // Check exact term equality
    if (termA.equals(termB)) {
      return 0;
    }

    // Handle quoted triples
    if (termA.termType === 'Quad' && termB.termType === 'Quad') {
      const orderSubject = this.orderTypes(
        termA.subject,
        termB.subject,
      );
      if (orderSubject !== 0) {
        return orderSubject;
      }
      const orderPredicate = this.orderTypes(
        termA.predicate,
        termB.predicate,
      );
      if (orderPredicate !== 0) {
        return orderPredicate;
      }
      const orderObject = this.orderTypes(
        termA.object,
        termB.object,
      );
      if (orderObject !== 0) {
        return orderObject;
      }
      return this.orderTypes(
        termA.graph,
        termB.graph,
      );
    }

    // Handle literals
    if (termA.termType === 'Literal') {
      return this.orderLiteralTypes(termA, <RDF.Literal>termB);
    }

    return this.comparePrimitives(termA.value, termB.value);
  }

  private orderLiteralTypes(litA: RDF.Literal, litB: RDF.Literal): -1 | 0 | 1 {
    const myLitA: E.Literal<any> = this.internalEvaluator.transformer.transformLiteral(litA);
    const myLitB: E.Literal<any> = this.internalEvaluator.transformer.transformLiteral(litB);

    try {
      if ((<E.BooleanLiteral> this.equalityFunction.applyOnTerms([ myLitA, myLitB ], this.internalEvaluator))
        .typedValue) {
        return 0;
      }
      if ((<E.BooleanLiteral> this.lessThanFunction.applyOnTerms([ myLitA, myLitB ], this.internalEvaluator))
        .typedValue) {
        return -1;
      }
      return 1;
    } catch {
      // Fallback to string-based comparison
      const compareType = this.comparePrimitives(myLitA.dataType, myLitB.dataType);
      if (compareType !== 0) {
        return compareType;
      }
      return this.comparePrimitives(myLitA.str(), myLitB.str());
    }
  }

  private comparePrimitives(valueA: any, valueB: any): -1 | 0 | 1 {
    return valueA === valueB ? 0 : (valueA < valueB ? -1 : 1);
  }

  // SPARQL specifies that blankNode < namedNode < literal. Sparql star expands with < quads and we say < defaultGraph
  private readonly _TERM_ORDERING_PRIORITY = {
    Variable: 0,
    BlankNode: 1,
    NamedNode: 2,
    Literal: 3,
    Quad: 4,
    DefaultGraph: 5,
  };
}
