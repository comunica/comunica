import type {
  IActionBindingsAggregatorFactory,
  IActorBindingsAggregatorFactoryArgs,
  IActorBindingsAggregatorFactoryOutput,
} from '@comunica/bus-bindings-aggeregator-factory';
import {
  ActorBindingsAggregatorFactory,
} from '@comunica/bus-bindings-aggeregator-factory';
import type { IActorTest } from '@comunica/core';
import { GroupConcatAggregator } from './GroupConcatAggregator';

/**
 * A comunica Group Concat Expression Evaluator Aggregate Actor.
 */
export class ActorBindingsAggregatorFactoryGroupConcat extends ActorBindingsAggregatorFactory {
  public constructor(args: IActorBindingsAggregatorFactoryArgs) {
    super(args);
  }

  public async test(action: IActionBindingsAggregatorFactory): Promise<IActorTest> {
    if (action.expr.aggregator !== 'group_concat') {
      throw new Error('This actor only supports the \'group_concat\' aggregator.');
    }
    return {};
  }

  public async run(action: IActionBindingsAggregatorFactory): Promise<IActorBindingsAggregatorFactoryOutput> {
    return {
      aggregator: new GroupConcatAggregator(
        await action.factory.createEvaluator(action.expr.expression, action.context),
        action.expr.distinct,
        action.expr.separator,
      ),
    };
  }
}

