import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';
import { AggregateEvaluator } from '../evaluators/AggregateEvaluator';
import type { AsyncEvaluator } from '../evaluators/AsyncEvaluator';
import { string } from '../functions/Helpers';

export class GroupConcat extends AggregateEvaluator {
  private state: string | undefined = undefined;
  private readonly separator: string;

  public constructor(expr: Algebra.AggregateExpression,
    evaluator: AsyncEvaluator, throwError?: boolean) {
    super(expr, evaluator, throwError);
    this.separator = expr.separator || ' ';
  }

  public emptyValue(): RDF.Term {
    return string('').toRDF();
  }

  public putTerm(term: RDF.Term): void {
    if (this.state === undefined) {
      this.state = term.value;
    } else {
      this.state += this.separator + term.value;
    }
  }

  public termResult(): RDF.Term {
    if (this.state === undefined) {
      return this.emptyValue();
    }
    return string(this.state).toRDF();
  }
}
