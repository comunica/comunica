import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';
import { AggregateEvaluator } from '../evaluators/AggregateEvaluator';
import type { AsyncEvaluator } from '../evaluators/AsyncEvaluator';
import type * as E from '../expressions';
import { regularFunctions } from '../functions';
import { integer } from '../functions/Helpers';
import * as C from '../util/Consts';

type SumState = E.NumericLiteral;

export class Sum extends AggregateEvaluator {
  private state: SumState | undefined = undefined;
  private readonly summer = regularFunctions[C.RegularOperator.ADDITION];

  public constructor(expr: Algebra.AggregateExpression,
    evaluator: AsyncEvaluator, throwError?: boolean) {
    super(expr, evaluator, throwError);
  }

  public static emptyValue(): RDF.Term {
    return integer(0).toRDF();
  }

  public put(term: RDF.Term): void {
    if (this.state === undefined) {
      this.state = this.termToNumericOrError(term);
    } else {
      const internalTerm = this.termToNumericOrError(term);
      this.state = <E.NumericLiteral> this.summer.apply([ this.state, internalTerm ], this.evaluator.context);
    }
  }

  public result(): RDF.Term {
    if (this.state === undefined) {
      return Sum.emptyValue();
    }
    return this.state.toRDF();
  }
}
