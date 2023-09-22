import type { IActionBindingsAggregatorFactory,
  IActorBindingsAggregatorFactoryArgs, IActorBindingsAggregatorFactoryOutput } from '@comunica/bus-bindings-aggeregator-factory';
import {
  ActorBindingsAggregatorFactory,
} from '@comunica/bus-bindings-aggeregator-factory';
import type { IActorTest } from '@comunica/core';
import { WildcardCountAggregator } from './WildcardCountAggregator';

/**
 * A comunica Wildcard Count Expression Evaluator Aggregate Actor.
 */
export class ActorExpressionEvaluatorAggregateWildcardCount extends ActorBindingsAggregatorFactory {
  public constructor(args: IActorBindingsAggregatorFactoryArgs) {
    super(args);
  }

  public async test(action: IActionBindingsAggregatorFactory): Promise<IActorTest> {
    if (action.expr.aggregator !== 'count' || action.expr.expression.expressionType !== 'wildcard') {
      throw new Error('This actor only supports the \'count\' aggregator with wildcard.');
    }
    return {};
  }

  public async run(action: IActionBindingsAggregatorFactory): Promise<IActorBindingsAggregatorFactoryOutput> {
    return {
      aggregator: new WildcardCountAggregator(action.expr, action.factory, action.context),
    };
  }
}
