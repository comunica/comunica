import type {
  IActionBindingsAggregatorFactory,
  IActorBindingsAggregatorFactoryArgs,
  IActorBindingsAggregatorFactoryOutput,
} from '@comunica/bus-bindings-aggeregator-factory';
import {
  ActorBindingsAggregatorFactory,
} from '@comunica/bus-bindings-aggeregator-factory';
import type { MediatorTermComparatorFactory } from '@comunica/bus-term-comparator-factory';
import type { IActorTest } from '@comunica/core';
import { MinAggregator } from './MinAggregator';

export interface IActorBindingsAggregatorFactoryMinArgs extends IActorBindingsAggregatorFactoryArgs {
  mediatorTermComparatorFactory: MediatorTermComparatorFactory;
}

/**
 * A comunica Min Expression Evaluator Aggregate Actor.
 */
export class ActorBindingsAggregatorFactoryMin extends ActorBindingsAggregatorFactory {
  private readonly mediatorTermComparatorFactory: MediatorTermComparatorFactory;

  public constructor(args: IActorBindingsAggregatorFactoryMinArgs) {
    super(args);
    this.mediatorTermComparatorFactory = args.mediatorTermComparatorFactory;
  }

  public async test(action: IActionBindingsAggregatorFactory): Promise<IActorTest> {
    if (action.expr.aggregator !== 'min') {
      throw new Error('This actor only supports the \'min\' aggregator.');
    }
    return {};
  }

  public async run({ context, expr }: IActionBindingsAggregatorFactory):
  Promise<IActorBindingsAggregatorFactoryOutput> {
    return new MinAggregator(
      await this.mediatorExpressionEvaluatorFactory.mediate({ algExpr: expr.expression, context }),
      expr.distinct,
      await this.mediatorTermComparatorFactory.mediate({ context }),
    );
  }
}
