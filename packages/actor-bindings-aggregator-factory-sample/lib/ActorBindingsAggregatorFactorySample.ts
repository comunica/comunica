import type {
  IActionBindingsAggregatorFactory,
  IActorBindingsAggregatorFactoryArgs,
  IActorBindingsAggregatorFactoryOutput,
} from '@comunica/bus-bindings-aggeregator-factory';
import {
  ActorBindingsAggregatorFactory,
} from '@comunica/bus-bindings-aggeregator-factory';
import type { IActorTest } from '@comunica/core';
import { SampleAggregator } from './SampleAggregator';

/**
 * A comunica Sample Expression Evaluator Aggregate Actor.
 */
export class ActorBindingsAggregatorFactorySample extends ActorBindingsAggregatorFactory {
  public constructor(args: IActorBindingsAggregatorFactoryArgs) {
    super(args);
  }

  public async test(action: IActionBindingsAggregatorFactory): Promise<IActorTest> {
    if (action.expr.aggregator !== 'sample') {
      throw new Error('This actor only supports the \'sample\' aggregator.');
    }
    return {};
  }

  public async run(action: IActionBindingsAggregatorFactory): Promise<IActorBindingsAggregatorFactoryOutput> {
    return {
      aggregator: new SampleAggregator(
        await action.factory.createEvaluator(action.expr, action.context),
        action.expr.distinct,
      ),
    };
  }
}

