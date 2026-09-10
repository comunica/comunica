import type { InternalEvaluator } from '@comunica/actor-expression-evaluator-factory-default';
import { TermFunctionLesserThan } from '@comunica/actor-function-factory-term-lesser-than';
import type { ITermFunction } from '@comunica/bus-function-factory';
import type { ITermComparator } from '@comunica/bus-term-comparator-factory';
import type * as Eval from '@comunica/utils-expression-evaluator';
import type * as RDF from '@rdfjs/types';

/**
 * The name the expression evaluator gives each RDF/JS term type.
 *
 * Only needed to look a term up in {@link TermFunctionLesserThan.TERM_ORDERING_PRIORITY}, which is keyed
 * by the evaluator's names. A term type that is absent here, such as a variable, is not one this
 * comparator short-circuits, and falls through to the operator itself.
 */
const EVALUATOR_TERM_TYPES: Partial<Record<
  RDF.Term['termType'],
keyof typeof TermFunctionLesserThan.TERM_ORDERING_PRIORITY
>> = {
  BlankNode: 'blankNode',
  NamedNode: 'namedNode',
  Literal: 'literal',
  Quad: 'quad',
  DefaultGraph: 'defaultGraph',
};

export class TermComparatorExpressionEvaluator implements ITermComparator {
  public constructor(
    // The internal evaluator is expected to have a context with nonLexicalComparison and fullTermComparison set to true
    private readonly internalEvaluator: InternalEvaluator,
    // TODO: remove in next major, as it's unused
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

    if (termA.termType === termB.termType) {
      // Two IRIs, or two blank nodes, are ordered by their value, which is exactly what the general path
      // below computes for them, at the cost of transforming both terms and evaluating `<` twice. Every
      // other type keeps that path: notably `xsd:string` literals are compared with `localeCompare`,
      // which a value comparison would not reproduce.
      if (termA.termType === 'NamedNode' || termA.termType === 'BlankNode') {
        if (termA.value === termB.value) {
          return 0;
        }
        return termA.value < termB.value ? -1 : 1;
      }
    } else {
      // Terms of differing types are ordered by type alone, by the same table the `<` implementation
      // orders them with, so that the two cannot drift apart.
      const priorityA = EVALUATOR_TERM_TYPES[termA.termType];
      const priorityB = EVALUATOR_TERM_TYPES[termB.termType];
      if (priorityA !== undefined && priorityB !== undefined) {
        return TermFunctionLesserThan.TERM_ORDERING_PRIORITY[priorityA] <
          TermFunctionLesserThan.TERM_ORDERING_PRIORITY[priorityB] ?
            -1 :
          1;
      }
    }

    return this.orderTypesGeneral(termA, termB);
  }

  /**
   * Order two defined terms by evaluating the SPARQL `<` operator in both directions.
   * @param termA the first term
   * @param termB the second term
   */
  private orderTypesGeneral(termA: RDF.Term, termB: RDF.Term): -1 | 0 | 1 {
    const myTermA: Eval.Term = this.internalEvaluator.transformer.transformRDFTermUnsafe(termA);
    const myTermB: Eval.Term = this.internalEvaluator.transformer.transformRDFTermUnsafe(termB);

    if ((<Eval.BooleanLiteral> this.lessThanFunction.applyOnTerms([ myTermA, myTermB ], this.internalEvaluator))
      .typedValue) {
      return -1;
    }
    if ((<Eval.BooleanLiteral> this.lessThanFunction.applyOnTerms([ myTermB, myTermA ], this.internalEvaluator))
      .typedValue) {
      return 1;
    }
    return 0;
  }
}
