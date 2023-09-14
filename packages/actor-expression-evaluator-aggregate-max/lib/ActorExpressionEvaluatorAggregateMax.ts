import type {
  IActionExpressionEvaluatorAggregate,
  IActorExpressionEvaluatorAggregateOutput,
  IActorExpressionEvaluatorAggregateArgs,
} from '@comunica/bus-expression-evaluator-aggregate';
import { ActorExpressionEvaluatorAggregate } from '@comunica/bus-expression-evaluator-aggregate';
import type { IActorTest } from '@comunica/core';
import type { AsyncEvaluator } from '@comunica/expression-evaluator';
import { AggregateEvaluator, orderTypes } from '@comunica/expression-evaluator';
import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Max Expression Evaluator Aggregate Actor.
 */
export class ActorExpressionEvaluatorAggregateMax extends ActorExpressionEvaluatorAggregate {
  public constructor(args: IActorExpressionEvaluatorAggregateArgs) {
    super(args);
  }

  public async test(action: IActionExpressionEvaluatorAggregate): Promise<IActorTest> {
    return action.expr.aggregator === 'max';
  }

  public async run(action: IActionExpressionEvaluatorAggregate): Promise<IActorExpressionEvaluatorAggregateOutput> {
    return {
      aggregator: new MaxAggregator(action.expr, action.evaluator),
    };
  }
}

class MaxAggregator extends AggregateEvaluator {
  private state: RDF.Term | undefined = undefined;
  public constructor(expr: Algebra.AggregateExpression,
    evaluator: AsyncEvaluator, throwError?: boolean) {
    super(expr, evaluator, throwError);
  }

  public putTerm(term: RDF.Term): void {
    if (term.termType !== 'Literal') {
      throw new Error(`Term with value ${term.value} has type ${term.termType} and is not a literal`);
    }
    if (this.state === undefined) {
      this.state = term;
    } else if (orderTypes(this.state, term) === -1) {
      this.state = term;
    }
  }

  public termResult(): RDF.Term | undefined {
    if (this.state === undefined) {
      return this.emptyValue();
    }
    return this.state;
  }
}
