import type {
  IActionBindingsAggregatorFactory,
  IActorBindingsAggregatorFactoryArgs,
  IActorBindingsAggregatorFactoryOutput,
} from '@comunica/bus-bindings-aggeregator-factory';
import {
  ActorBindingsAggregatorFactory,
} from '@comunica/bus-bindings-aggeregator-factory';
import type { IActorTest } from '@comunica/core';
import { Algebra } from 'sparqlalgebrajs';
import { CountAggregator } from './CountAggregator';

/**
 * A comunica Count Expression Evaluator Aggregate Actor.
 */
export class ActorBindingsAggregatorFactoryCount extends ActorBindingsAggregatorFactory {
  public constructor(args: IActorBindingsAggregatorFactoryArgs) {
    super(args);
  }

  public async test(action: IActionBindingsAggregatorFactory): Promise<IActorTest> {
    if (action.expr.aggregator !== 'count' ||
      action.expr.expression.expressionType === Algebra.expressionTypes.WILDCARD) {
      throw new Error('This actor only supports the \'count\' aggregator without wildcard.');
    }
    return {};
  }

  public async run({ factory, context, expr }: IActionBindingsAggregatorFactory): Promise<IActorBindingsAggregatorFactoryOutput> {
    return {
      aggregator: new CountAggregator(
        (await factory.run({ algExpr: expr.expression, context })).expressionEvaluator,
        expr.distinct,
      ),
    };
  }
}

