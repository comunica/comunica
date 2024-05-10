import type {
  IActionBindingsAggregatorFactory,
  IActorBindingsAggregatorFactoryArgs,
  IActorBindingsAggregatorFactoryOutput,
} from '@comunica/bus-bindings-aggeregator-factory';
import { ActorBindingsAggregatorFactory } from '@comunica/bus-bindings-aggeregator-factory';

import type { MediatorFunctionFactory, MediatorFunctionFactoryUnsafe } from '@comunica/bus-function-factory';
import type { IActorTest } from '@comunica/core';
import { RegularOperator } from '@comunica/expression-evaluator';
import { AverageAggregator } from './AverageAggregator';

export interface IActorBindingsAggregatorFactoryAverageArgs extends IActorBindingsAggregatorFactoryArgs {
  mediatorFunctionFactory: MediatorFunctionFactoryUnsafe;
}

/**
 * A comunica Average Expression Evaluator Aggregate Actor.
 */
export class ActorBindingsAggregatorFactoryAverage extends ActorBindingsAggregatorFactory {
  private readonly mediatorFunctionFactory: MediatorFunctionFactory;

  public constructor(args: IActorBindingsAggregatorFactoryAverageArgs) {
    super(args);
    this.mediatorFunctionFactory = <MediatorFunctionFactory>args.mediatorFunctionFactory;
  }

  public async test(action: IActionBindingsAggregatorFactory): Promise<IActorTest> {
    if (action.expr.aggregator !== 'avg') {
      throw new Error('This actor only supports the \'avg\' aggregator.');
    }
    return {};
  }

  public async run({ context, expr }: IActionBindingsAggregatorFactory):
  Promise<IActorBindingsAggregatorFactoryOutput> {
    return new AverageAggregator(
      await this.mediatorExpressionEvaluatorFactory.mediate({ algExpr: expr.expression, context }),
      expr.distinct,
      await this.mediatorFunctionFactory.mediate({
        functionName: RegularOperator.ADDITION,
        context,
        requireTermExpression: true,
      }),
      await this.mediatorFunctionFactory.mediate({
        functionName: RegularOperator.DIVISION,
        context,
        requireTermExpression: true,
      }),
    );
  }
}
