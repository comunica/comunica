import type {
  IActionBindingsAggregatorFactory,
  IActorBindingsAggregatorFactoryArgs,
  IActorBindingsAggregatorFactoryOutput,
} from '@comunica/bus-bindings-aggregator-factory';
import {
  ActorBindingsAggregatorFactory,
} from '@comunica/bus-bindings-aggregator-factory';
import type { MediatorFunctionFactory, MediatorFunctionFactoryUnsafe } from '@comunica/bus-function-factory';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
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

  public async test(action: IActionBindingsAggregatorFactory): Promise<TestResult<IActorTest>> {
    if (action.expr.aggregator !== 'sum') {
      return failTest('This actor only supports the \'sum\' aggregator.');
    }
    return passTestVoid();
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
