import type {
  IActionBindingsAggregatorFactory,
  IActorBindingsAggregatorFactoryArgs,
  IActorBindingsAggregatorFactoryOutput,
} from '@comunica/bus-bindings-aggregator-factory';
import { ActorBindingsAggregatorFactory } from '@comunica/bus-bindings-aggregator-factory';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import { GroupConcatAggregator } from './GroupConcatAggregator';

/**
 * A comunica Group Concat Expression Evaluator Aggregate Actor.
 */
export class ActorBindingsAggregatorFactoryGroupConcat extends ActorBindingsAggregatorFactory {
  public constructor(args: IActorBindingsAggregatorFactoryArgs) {
    super(args);
  }

  public async test(action: IActionBindingsAggregatorFactory): Promise<TestResult<IActorTest>> {
    if (action.expr.aggregator !== 'group_concat') {
      return failTest('This actor only supports the \'group_concat\' aggregator.');
    }
    return passTestVoid();
  }

  public async run({ context, expr }: IActionBindingsAggregatorFactory):
  Promise<IActorBindingsAggregatorFactoryOutput> {
    return new GroupConcatAggregator(
      await this.mediatorExpressionEvaluatorFactory.mediate({ algExpr: expr.expression, context }),
      expr.distinct,
      context.getSafe(KeysInitQuery.dataFactory),
      expr.separator,
    );
  }
}
