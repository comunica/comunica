import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';
import type { ICompleteSharedContext } from '../evaluators/evaluatorHelpers/BaseExpressionEvaluator';
import type * as E from '../expressions';
import { TermTransformer } from '../transformers/TermTransformer';
import type { ITermTransformer } from '../transformers/TermTransformer';
import { TypeAlias } from '../util/Consts';
import { isSubTypeOf } from '../util/TypeHandling';

export abstract class BaseAggregator<State> {
  protected distinct: boolean;
  protected separator: string;
  protected termTransformer: ITermTransformer;

  public constructor(expr: Algebra.AggregateExpression, protected sharedContext: ICompleteSharedContext) {
    this.distinct = expr.distinct;
    this.separator = expr.separator || ' ';
    this.termTransformer = new TermTransformer(sharedContext.superTypeProvider);
  }

  protected termToNumericOrError(term: RDF.Term): E.NumericLiteral {
    // TODO: Check behaviour
    if (term.termType !== 'Literal') {
      throw new Error(`Term with value ${term.value} has type ${term.termType} and is not a numeric literal`);
    } else if (
      !isSubTypeOf(term.datatype.value, TypeAlias.SPARQL_NUMERIC, this.sharedContext.superTypeProvider)
    ) {
      throw new Error(`Term datatype ${term.datatype.value} with value ${term.value} has type ${term.termType} and is not a numeric literal`);
    }
    return <E.NumericLiteral> this.termTransformer.transformLiteral(term);
  }

  protected extractValue(term: RDF.Term): { value: any; type: string } {
    if (term.termType !== 'Literal') {
      throw new Error(`Term with value ${term.value} has type ${term.termType} and is not a literal`);
    }

    const transformedLit = this.termTransformer.transformLiteral(term);
    return { type: transformedLit.dataType, value: transformedLit.typedValue };
  }

  public static emptyValue(): RDF.Term | undefined {
    return undefined;
  }

  abstract init(start: RDF.Term): State;

  abstract result(state: State): RDF.Term;

  abstract put(state: State, bindings: RDF.Term): State;
}
