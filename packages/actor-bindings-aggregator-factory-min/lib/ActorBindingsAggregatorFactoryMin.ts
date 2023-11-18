import type {
  IActionBindingsAggregatorFactory,
  IActorBindingsAggregatorFactoryArgs,
  IActorBindingsAggregatorFactoryOutput,
} from '@comunica/bus-bindings-aggeregator-factory';
import {
  ActorBindingsAggregatorFactory,
} from '@comunica/bus-bindings-aggeregator-factory';
import type { IActorTest } from '@comunica/core';
import { MinAggregator } from './MinAggregator';

/**
 * A comunica Min Expression Evaluator Aggregate Actor.
 */
export class ActorBindingsAggregatorFactoryMin extends ActorBindingsAggregatorFactory {
  public constructor(args: IActorBindingsAggregatorFactoryArgs) {
    super(args);
  }

  public async test(action: IActionBindingsAggregatorFactory): Promise<IActorTest> {
    if (action.expr.aggregator !== 'min') {
      throw new Error('This actor only supports the \'min\' aggregator.');
    }
    return {};
  }

  public async run({ factory, context, expr }: IActionBindingsAggregatorFactory):
  Promise<IActorBindingsAggregatorFactoryOutput> {
    return {
      aggregator: new MinAggregator(
        await factory.createEvaluator(expr.expression, context),
        expr.distinct,
        await factory.createTermComparator({ context }),
      ),
    };
  }
}

