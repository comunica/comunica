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
import { MaxAggregator } from './MaxAggregator';

/**
 * A comunica Max Expression Evaluator Aggregate Actor.
 */
export class ActorBindingsAggregatorFactoryMax extends ActorBindingsAggregatorFactory {
  private readonly factory: ActorExpressionEvaluatorFactory;

  public constructor(args: IActorBindingsAggregatorFactoryArgs & { factory: ActorExpressionEvaluatorFactory }) {
    super(args);
    this.factory = args.factory;
  }

  public async test(action: IActionBindingsAggregatorFactory): Promise<IActorTest> {
    if (action.expr.aggregator !== 'max') {
      throw new Error('This actor only supports the \'max\' aggregator.');
    }
    return {};
  }

  public async run({ expr, context }: IActionBindingsAggregatorFactory):
  Promise<IActorBindingsAggregatorFactoryOutput> {
    return {
      aggregator: new MaxAggregator(
        (await this.factory.run({ algExpr: expr.expression, context })).expressionEvaluator,
        expr.distinct,
        await this.factory.createTermComparator({ context }),
      ),
    };
  }
}
