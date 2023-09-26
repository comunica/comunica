import type {
  IActionBindingsAggregatorFactory,
  IActorBindingsAggregatorFactoryArgs, IActorBindingsAggregatorFactoryOutput,
} from '@comunica/bus-bindings-aggeregator-factory';
import { ActorBindingsAggregatorFactory } from '@comunica/bus-bindings-aggeregator-factory';
import type { IActorTest } from '@comunica/core';
import { AverageAggregator } from './AverageAggregator';

/**
 * A comunica Average Expression Evaluator Aggregate Actor.
 */
export class ActorBindingsAggregatorFactoryAverage extends ActorBindingsAggregatorFactory {
  public constructor(args: IActorBindingsAggregatorFactoryArgs) {
    super(args);
  }

  public async test(action: IActionBindingsAggregatorFactory): Promise<IActorTest> {
    if (action.expr.aggregator !== 'avg') {
      throw new Error('This actor only supports the \'avg\' aggregator.');
    }
    return {};
  }

  public async run(action: IActionBindingsAggregatorFactory): Promise<IActorBindingsAggregatorFactoryOutput> {
    return {
      aggregator: new AverageAggregator(action.expr, action.factory, action.context),
    };
  }
}

