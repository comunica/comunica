import type {
  IActionBindingsAggregatorFactory,
  IActorBindingsAggregatorFactoryArgs, IActorBindingsAggregatorFactoryOutput,
} from '@comunica/bus-bindings-aggeregator-factory';
import { ActorBindingsAggregatorFactory } from '@comunica/bus-bindings-aggeregator-factory';
import type { ActorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import type { IActorTest } from '@comunica/core';
import { RegularOperator } from '@comunica/expression-evaluator';
import { AverageAggregator } from './AverageAggregator';

/**
 * A comunica Average Expression Evaluator Aggregate Actor.
 */
export class ActorBindingsAggregatorFactoryAverage extends ActorBindingsAggregatorFactory {
  private readonly factory: ActorExpressionEvaluatorFactory;
  public constructor(args: IActorBindingsAggregatorFactoryArgs & { factory: ActorExpressionEvaluatorFactory }) {
    super(args);
    this.factory = args.factory;
  }

  public async test(action: IActionBindingsAggregatorFactory): Promise<IActorTest> {
    if (action.expr.aggregator !== 'avg') {
      throw new Error('This actor only supports the \'avg\' aggregator.');
    }
    return {};
  }

  public async run({ context, expr }: IActionBindingsAggregatorFactory):
  Promise<IActorBindingsAggregatorFactoryOutput> {
    return {
      aggregator: new AverageAggregator(
        (await this.factory.run({ algExpr: expr.expression, context })).expressionEvaluator,
        expr.distinct,
        await this.factory.createFunction({
          functionName: RegularOperator.ADDITION,
          context,
          requireTermExpression: true,
        }),
        await this.factory.createFunction({
          functionName: RegularOperator.DIVISION,
          context,
          requireTermExpression: true,
        }),
      ),
    };
  }
}

