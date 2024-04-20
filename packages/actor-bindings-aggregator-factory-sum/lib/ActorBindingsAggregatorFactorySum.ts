import type {
  IActionBindingsAggregatorFactory,
  IActorBindingsAggregatorFactoryArgs,
  IActorBindingsAggregatorFactoryOutput,
} from '@comunica/bus-bindings-aggeregator-factory';
import {
  ActorBindingsAggregatorFactory,
} from '@comunica/bus-bindings-aggeregator-factory';
import type { MediatorFunctions, MediatorFunctionsUnsafe } from '@comunica/bus-functions';
import type { IActorTest } from '@comunica/core';
import { RegularOperator } from '@comunica/expression-evaluator';
import { SumAggregator } from './SumAggregator';

export interface IActorBindingsAggregatorFactorySumArgs extends IActorBindingsAggregatorFactoryArgs {
  mediatorFunctions: MediatorFunctionsUnsafe;
}

/**
 * A comunica Sum Expression Evaluator Aggregate Actor.
 */
export class ActorBindingsAggregatorFactorySum extends ActorBindingsAggregatorFactory {
  private readonly mediatorFunctions: MediatorFunctions;

  public constructor(args: IActorBindingsAggregatorFactorySumArgs) {
    super(args);
    this.mediatorFunctions = <MediatorFunctions> args.mediatorFunctions;
  }

  public async test(action: IActionBindingsAggregatorFactory): Promise<IActorTest> {
    if (action.expr.aggregator !== 'sum') {
      throw new Error('This actor only supports the \'sum\' aggregator.');
    }
    return {};
  }

  public async run({ expr, context }: IActionBindingsAggregatorFactory):
  Promise<IActorBindingsAggregatorFactoryOutput> {
    return new SumAggregator(
      await this.mediatorExpressionEvaluatorFactory.mediate({ algExpr: expr.expression, context }),
      expr.distinct,
      await this.mediatorFunctions.mediate({
        functionName: RegularOperator.ADDITION,
        context,
        requireTermExpression: true,
      }),
    );
  }
}

