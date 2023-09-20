import type {
  IActionExpressionEvaluatorAggregate,
  IActorExpressionEvaluatorAggregateOutput,
  IActorExpressionEvaluatorAggregateArgs,
} from '@comunica/bus-expression-evaluator-aggregate';
import { ActorExpressionEvaluatorAggregate } from '@comunica/bus-expression-evaluator-aggregate';
import type { IActorTest } from '@comunica/core';
import type { ExpressionEvaluatorFactory } from '@comunica/expression-evaluator';
import { AggregateEvaluator } from '@comunica/expression-evaluator';
import type { IActionContext } from '@comunica/types';
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
    if (action.expr.aggregator !== 'sample') {
      throw new Error('This actor only supports the \'sample\' aggregator.');
    }
    return {};
  }

  public async run(action: IActionExpressionEvaluatorAggregate): Promise<IActorExpressionEvaluatorAggregateOutput> {
    return {
      aggregator: new SampleAggregator(action.expr, action.factory, action.context),
    };
  }
}

class SampleAggregator extends AggregateEvaluator {
  private state: RDF.Term | undefined = undefined;

  public constructor(aggregateExpression: Algebra.AggregateExpression,
    expressionEvaluatorFactory: ExpressionEvaluatorFactory, context: IActionContext,
    throwError?: boolean) {
    super(aggregateExpression, expressionEvaluatorFactory, context, throwError);
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
