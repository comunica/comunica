import type {
  IActionBindingsAggregatorFactory,
  IActorBindingsAggregatorFactoryArgs, IActorBindingsAggregatorFactoryOutput,
} from '@comunica/bus-bindings-aggeregator-factory';
import { ActorBindingsAggregatorFactory } from '@comunica/bus-bindings-aggeregator-factory';
import type { IActorTest } from '@comunica/core';
import { RegularOperator } from '@comunica/expression-evaluator';
import type { ITermFunction } from '@comunica/types';
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

  public async run({ factory, context, expr }: IActionBindingsAggregatorFactory):
  Promise<IActorBindingsAggregatorFactoryOutput> {
    return {
      aggregator: new AverageAggregator(
        await factory.createEvaluator(expr.expression, context),
        expr.distinct,
        <ITermFunction> await factory.createFunction({
          functionName: RegularOperator.ADDITION,
          context,
          definitionType: 'onTerm',
        }),
        <ITermFunction> await factory.createFunction({
          functionName: RegularOperator.DIVISION,
          context,
          definitionType: 'onTerm',
        }),
      ),
    };
  }
}

