import type {
  IActionBindingsAggregatorFactory,
  IActorBindingsAggregatorFactoryArgs, IActorBindingsAggregatorFactoryOutput,
} from '@comunica/bus-bindings-aggeregator-factory';
import { ActorBindingsAggregatorFactory } from '@comunica/bus-bindings-aggeregator-factory';

import type { MediatorFunctions, MediatorFunctionsUnsafe } from '@comunica/bus-functions';
import type { IActorTest } from '@comunica/core';
import { RegularOperator } from '@comunica/expression-evaluator';
import { AverageAggregator } from './AverageAggregator';

export interface IActorBindingsAggregatorFactoryAverageArgs extends IActorBindingsAggregatorFactoryArgs {
  mediatorFunctions: MediatorFunctionsUnsafe;
}

/**
 * A comunica Average Expression Evaluator Aggregate Actor.
 */
export class ActorBindingsAggregatorFactoryAverage extends ActorBindingsAggregatorFactory {
  private readonly mediatorFunctions: MediatorFunctions;

  public constructor(args: IActorBindingsAggregatorFactoryAverageArgs) {
    super(args);
    this.mediatorFunctions = <MediatorFunctions>args.mediatorFunctions;
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
      await this.mediatorFunctions.mediate({
        functionName: RegularOperator.ADDITION,
        context,
        requireTermExpression: true,
      }),
      await this.mediatorFunctions.mediate({
        functionName: RegularOperator.DIVISION,
        context,
        requireTermExpression: true,
      }),
    );
  }
}

