import type {
  IActionBindingsAggregatorFactory,
  IActorBindingsAggregatorFactoryArgs,
  IActorBindingsAggregatorFactoryOutput,
} from '@comunica/bus-bindings-aggregator-factory';
import {
  ActorBindingsAggregatorFactory,
} from '@comunica/bus-bindings-aggregator-factory';
import type { MediatorTermComparatorFactory } from '@comunica/bus-term-comparator-factory';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import { MaxAggregator } from './MaxAggregator';

export interface IActorBindingsAggregatorFactoryMaxArgs extends IActorBindingsAggregatorFactoryArgs {
  mediatorTermComparatorFactory: MediatorTermComparatorFactory;
}

/**
 * A comunica Max Expression Evaluator Aggregate Actor.
 */
export class ActorBindingsAggregatorFactoryMax extends ActorBindingsAggregatorFactory {
  private readonly mediatorTermComparatorFactory: MediatorTermComparatorFactory;

  public constructor(args: IActorBindingsAggregatorFactoryMaxArgs) {
    super(args);
    this.mediatorTermComparatorFactory = args.mediatorTermComparatorFactory;
  }

  public async test(action: IActionBindingsAggregatorFactory): Promise<TestResult<IActorTest>> {
    if (action.expr.aggregator !== 'max') {
      return failTest('This actor only supports the \'max\' aggregator.');
    }
    return passTestVoid();
  }

  public async run({ expr, context }: IActionBindingsAggregatorFactory):
  Promise<IActorBindingsAggregatorFactoryOutput> {
    return new MaxAggregator(
      await this.mediatorExpressionEvaluatorFactory.mediate({ algExpr: expr.expression, context }),
      expr.distinct,
      await this.mediatorTermComparatorFactory.mediate({ context }),
    );
  }
}
