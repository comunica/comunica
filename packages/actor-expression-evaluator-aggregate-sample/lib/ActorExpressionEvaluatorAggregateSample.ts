import type {
  IActionExpressionEvaluatorAggregate,
  IActorExpressionEvaluatorAggregateOutput,
  IActorExpressionEvaluatorAggregateArgs,
} from '@comunica/bus-expression-evaluator-aggregate';
import { ActorExpressionEvaluatorAggregate } from '@comunica/bus-expression-evaluator-aggregate';
import type { IActorTest } from '@comunica/core';
import type { AsyncEvaluator } from '@comunica/expression-evaluator';
import { AggregateEvaluator } from '@comunica/expression-evaluator';
import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Sample Expression Evaluator Aggregate Actor.
 */
export class ActorExpressionEvaluatorAggregateSample extends ActorExpressionEvaluatorAggregate {
  public constructor(args: IActorExpressionEvaluatorAggregateArgs) {
    super(args);
  }

  public async test(action: IActionExpressionEvaluatorAggregate): Promise<IActorTest> {
    return action.expr.aggregator === 'sample';
  }

  public async run(action: IActionExpressionEvaluatorAggregate): Promise<IActorExpressionEvaluatorAggregateOutput> {
    return {
      aggregator: new SampleAggregator(action.expr, action.evaluator),
    };
  }
}

class SampleAggregator extends AggregateEvaluator {
  private state: RDF.Term | undefined = undefined;

  public constructor(expr: Algebra.AggregateExpression,
    evaluator: AsyncEvaluator, throwError?: boolean) {
    super(expr, evaluator, throwError);
  }

  public putTerm(term: RDF.Term): void {
    // First value is our sample
    if (this.state === undefined) {
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
