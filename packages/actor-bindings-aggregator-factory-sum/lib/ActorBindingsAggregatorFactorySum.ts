import type {
  IActionBindingsAggregatorFactory,
  IActorBindingsAggregatorFactoryArgs,
  IActorBindingsAggregatorFactoryOutput,
} from '@comunica/bus-bindings-aggeregator-factory';
import {
  ActorBindingsAggregatorFactory,
} from '@comunica/bus-bindings-aggeregator-factory';
import type { IActorTest } from '@comunica/core';
import { RegularOperator } from '@comunica/expression-evaluator';
import { SumAggregator } from './SumAggregator';

/**
 * A comunica Sum Expression Evaluator Aggregate Actor.
 */
export class ActorBindingsAggregatorFactorySum extends ActorBindingsAggregatorFactory {
  public constructor(args: IActorBindingsAggregatorFactoryArgs) {
    super(args);
  }

  public async test(action: IActionBindingsAggregatorFactory): Promise<IActorTest> {
    if (action.expr.aggregator !== 'sum') {
      throw new Error('This actor only supports the \'sum\' aggregator.');
    }
    return {};
  }

  public async run(action: IActionBindingsAggregatorFactory): Promise<IActorBindingsAggregatorFactoryOutput> {
    return {
      aggregator: new SumAggregator(
        await action.factory.createEvaluator(action.expr, action.context),
        action.expr.distinct,
        await action.factory.createTermFunction({ functionName: RegularOperator.ADDITION }),
      ),
    };
  }
}

