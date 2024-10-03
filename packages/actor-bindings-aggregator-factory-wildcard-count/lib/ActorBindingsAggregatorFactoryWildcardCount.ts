import type {
  IActionBindingsAggregatorFactory,
  IActorBindingsAggregatorFactoryArgs,
  IActorBindingsAggregatorFactoryOutput,
} from '@comunica/bus-bindings-aggregator-factory';
import {
  ActorBindingsAggregatorFactory,
} from '@comunica/bus-bindings-aggregator-factory';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import { WildcardCountAggregator } from './WildcardCountAggregator';

/**
 * A comunica Wildcard Count Expression Evaluator Aggregate Actor.
 */
export class ActorBindingsAggregatorFactoryWildcardCount extends ActorBindingsAggregatorFactory {
  public constructor(args: IActorBindingsAggregatorFactoryArgs) {
    super(args);
  }

  public async test(action: IActionBindingsAggregatorFactory): Promise<TestResult<IActorTest>> {
    if (action.expr.aggregator !== 'count' || action.expr.expression.expressionType !== 'wildcard') {
      return failTest('This actor only supports the \'count\' aggregator with wildcard.');
    }
    return passTestVoid();
  }

  public async run({ context, expr }: IActionBindingsAggregatorFactory):
  Promise<IActorBindingsAggregatorFactoryOutput> {
    return new WildcardCountAggregator(
      await this.mediatorExpressionEvaluatorFactory.mediate({ algExpr: expr.expression, context }),
      expr.distinct,
    );
  }
}
