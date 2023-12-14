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
import { SampleAggregator } from './SampleAggregator';

export interface IActorBindingsAggregatorFactorySampleArgs extends IActorBindingsAggregatorFactoryArgs {
  factory: ActorExpressionEvaluatorFactory;
}

/**
 * A comunica Sample Expression Evaluator Aggregate Actor.
 */
export class ActorBindingsAggregatorFactorySample extends ActorBindingsAggregatorFactory {
  private readonly factory: ActorExpressionEvaluatorFactory;

  public constructor(args: IActorBindingsAggregatorFactorySampleArgs) {
    super(args);
    this.factory = args.factory;
  }

  public async test(action: IActionBindingsAggregatorFactory): Promise<IActorTest> {
    if (action.expr.aggregator !== 'sample') {
      throw new Error('This actor only supports the \'sample\' aggregator.');
    }
    return {};
  }

  public async run({ context, expr }: IActionBindingsAggregatorFactory):
  Promise<IActorBindingsAggregatorFactoryOutput> {
    return {
      aggregator: new SampleAggregator(
        (await this.factory.run({ algExpr: expr.expression, context })).expressionEvaluator,
        expr.distinct,
      ),
    };
  }
}

