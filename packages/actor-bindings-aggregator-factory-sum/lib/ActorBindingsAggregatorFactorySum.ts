import type {
  IActionBindingsAggregatorFactory,
  IActorBindingsAggregatorFactoryArgs,
  IActorBindingsAggregatorFactoryOutput,
} from '@comunica/bus-bindings-aggeregator-factory';
import {
  ActorBindingsAggregatorFactory,
} from '@comunica/bus-bindings-aggeregator-factory';
import type { MediatorFunctionFactory, MediatorFunctionFactoryUnsafe } from '@comunica/bus-function-factory';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
import { SparqlOperator } from '@comunica/expression-evaluator';
import { SumAggregator } from './SumAggregator';

export interface IActorBindingsAggregatorFactorySumArgs extends IActorBindingsAggregatorFactoryArgs {
  mediatorFunctionFactory: MediatorFunctionFactoryUnsafe;
}

/**
 * A comunica Sum Expression Evaluator Aggregate Actor.
 */
export class ActorBindingsAggregatorFactorySum extends ActorBindingsAggregatorFactory {
  private readonly mediatorFunctionFactory: MediatorFunctionFactory;

  public constructor(args: IActorBindingsAggregatorFactorySumArgs) {
    super(args);
    this.mediatorFunctionFactory = <MediatorFunctionFactory> args.mediatorFunctionFactory;
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
      context.getSafe(KeysInitQuery.dataFactory),
      await this.mediatorFunctionFactory.mediate({
        functionName: SparqlOperator.ADDITION,
        context,
        requireTermExpression: true,
      }),
    );
  }
}
