import type {
  IActionBindingsAggregatorFactory,
  IActorBindingsAggregatorFactoryArgs,
  IActorBindingsAggregatorFactoryOutput,
} from '@comunica/bus-bindings-aggeregator-factory';
import {
  ActorBindingsAggregatorFactory,
} from '@comunica/bus-bindings-aggeregator-factory';
import type { ActorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import type { IActorTest } from '@comunica/core';
import { Algebra } from 'sparqlalgebrajs';
import { CountAggregator } from './CountAggregator';

/**
 * A comunica Count Expression Evaluator Aggregate Actor.
 */
export class ActorBindingsAggregatorFactoryCount extends ActorBindingsAggregatorFactory {
  private readonly factory: ActorExpressionEvaluatorFactory;

  public constructor(args: IActorBindingsAggregatorFactoryArgs & { factory: ActorExpressionEvaluatorFactory }) {
    super(args);
    this.factory = args.factory;
  }

  public async test(action: IActionBindingsAggregatorFactory): Promise<IActorTest> {
    if (action.expr.aggregator !== 'count' ||
      action.expr.expression.expressionType === Algebra.expressionTypes.WILDCARD) {
      throw new Error('This actor only supports the \'count\' aggregator without wildcard.');
    }
    return {};
  }

  public async run({ context, expr }: IActionBindingsAggregatorFactory): Promise<IActorBindingsAggregatorFactoryOutput> {
    return {
      aggregator: new CountAggregator(
        (await this.factory.run({ algExpr: expr.expression, context })).expressionEvaluator,
        expr.distinct,
      ),
    };
  }
}

