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
import { GroupConcatAggregator } from './GroupConcatAggregator';

export interface IActorBindingsAggregatorFactoryGroupConcatArgs extends IActorBindingsAggregatorFactoryArgs {
  factory: ActorExpressionEvaluatorFactory;
}

/**
 * A comunica Group Concat Expression Evaluator Aggregate Actor.
 */
export class ActorBindingsAggregatorFactoryGroupConcat extends ActorBindingsAggregatorFactory {
  private readonly factory: ActorExpressionEvaluatorFactory;

  public constructor(args: IActorBindingsAggregatorFactoryGroupConcatArgs) {
    super(args);
    this.factory = args.factory;
  }

  public async test(action: IActionBindingsAggregatorFactory): Promise<IActorTest> {
    if (action.expr.aggregator !== 'group_concat') {
      throw new Error('This actor only supports the \'group_concat\' aggregator.');
    }
    return {};
  }

  public async run({ context, expr }: IActionBindingsAggregatorFactory):
  Promise<IActorBindingsAggregatorFactoryOutput> {
    return {
      aggregator: new GroupConcatAggregator(
        (await this.factory.run({ algExpr: expr.expression, context })).expressionEvaluator,
        expr.distinct,
        expr.separator,
      ),
    };
  }
}

