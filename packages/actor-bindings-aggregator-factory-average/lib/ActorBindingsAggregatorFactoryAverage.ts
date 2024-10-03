import type {
  IActionBindingsAggregatorFactory,
  IActorBindingsAggregatorFactoryArgs,
  IActorBindingsAggregatorFactoryOutput,
} from '@comunica/bus-bindings-aggregator-factory';
import { ActorBindingsAggregatorFactory } from '@comunica/bus-bindings-aggregator-factory';

import type { MediatorFunctionFactory, MediatorFunctionFactoryUnsafe } from '@comunica/bus-function-factory';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import { SparqlOperator } from '@comunica/expression-evaluator';
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

  public async test(action: IActionBindingsAggregatorFactory): Promise<TestResult<IActorTest>> {
    if (action.expr.aggregator !== 'avg') {
      return failTest('This actor only supports the \'avg\' aggregator.');
    }
    return passTestVoid();
  }

  public async run({ context, expr }: IActionBindingsAggregatorFactory):
  Promise<IActorBindingsAggregatorFactoryOutput> {
    return new AverageAggregator(
      await this.mediatorExpressionEvaluatorFactory.mediate({ algExpr: expr.expression, context }),
      expr.distinct,
      context.getSafe(KeysInitQuery.dataFactory),
      await this.mediatorFunctionFactory.mediate({
        functionName: SparqlOperator.ADDITION,
        context,
        requireTermExpression: true,
      }),
      await this.mediatorFunctionFactory.mediate({
        functionName: SparqlOperator.DIVISION,
        context,
        requireTermExpression: true,
      }),
    );
  }
}
