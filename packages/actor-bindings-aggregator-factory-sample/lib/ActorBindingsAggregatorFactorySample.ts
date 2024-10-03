import type {
  IActionBindingsAggregatorFactory,
  IActorBindingsAggregatorFactoryArgs,
  IActorBindingsAggregatorFactoryOutput,
} from '@comunica/bus-bindings-aggregator-factory';
import {
  ActorBindingsAggregatorFactory,
} from '@comunica/bus-bindings-aggregator-factory';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import { SampleAggregator } from './SampleAggregator';

/**
 * A comunica Sample Expression Evaluator Aggregate Actor.
 */
export class ActorBindingsAggregatorFactorySample extends ActorBindingsAggregatorFactory {
  public constructor(args: IActorBindingsAggregatorFactoryArgs) {
    super(args);
  }

  public async test(action: IActionBindingsAggregatorFactory): Promise<TestResult<IActorTest>> {
    if (action.expr.aggregator !== 'sample') {
      return failTest('This actor only supports the \'sample\' aggregator.');
    }
    return passTestVoid();
  }

  public async run({ context, expr }: IActionBindingsAggregatorFactory):
  Promise<IActorBindingsAggregatorFactoryOutput> {
    return new SampleAggregator(
      await this.mediatorExpressionEvaluatorFactory.mediate({ algExpr: expr.expression, context }),
      expr.distinct,
    );
  }
}
