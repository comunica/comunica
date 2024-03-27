import type {
  IActionBindingsAggregatorFactory,
  IActorBindingsAggregatorFactoryArgs,
  IActorBindingsAggregatorFactoryOutput,
} from '@comunica/bus-bindings-aggeregator-factory';
import {
  ActorBindingsAggregatorFactory,
} from '@comunica/bus-bindings-aggeregator-factory';
import type { ActorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import type { IActorTest } from '@comunica/core';
import { WildcardCountAggregator } from './WildcardCountAggregator';

export interface IActorBindingsAggregatorFactoryWildcardCountArgs extends IActorBindingsAggregatorFactoryArgs {
  factory: ActorExpressionEvaluatorFactory;
}

/**
 * A comunica Wildcard Count Expression Evaluator Aggregate Actor.
 */
export class ActorBindingsAggregatorFactoryWildcardCount extends ActorBindingsAggregatorFactory {
  private readonly factory: ActorExpressionEvaluatorFactory;

  public constructor(args: IActorBindingsAggregatorFactoryWildcardCountArgs) {
    super(args);
    this.factory = args.factory;
  }

  public async test(action: IActionBindingsAggregatorFactory): Promise<IActorTest> {
    if (action.expr.aggregator !== 'count' || action.expr.expression.expressionType !== 'wildcard') {
      throw new Error('This actor only supports the \'count\' aggregator with wildcard.');
    }
    return {};
  }

  public async run({ context, expr }: IActionBindingsAggregatorFactory):
  Promise<IActorBindingsAggregatorFactoryOutput> {
    return {
      aggregator: new WildcardCountAggregator(
        (await this.factory.run({ algExpr: expr.expression, context })).expressionEvaluator,
        expr.distinct,
      ),
    };
  }
}
