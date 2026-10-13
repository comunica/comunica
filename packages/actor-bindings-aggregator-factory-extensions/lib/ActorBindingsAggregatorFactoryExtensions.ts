import type {
  IActionBindingsAggregatorFactory,
  IActorBindingsAggregatorFactoryArgs,
  IActorBindingsAggregatorFactoryOutput,
} from '@comunica/bus-bindings-aggregator-factory';
import { ActorBindingsAggregatorFactory } from '@comunica/bus-bindings-aggregator-factory';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import type { ExtensionAggregator, IActionContext } from '@comunica/types';
import { Algebra, isKnownSubType } from '@comunica/utils-algebra';

/**
 * A comunica Extensions Bindings Aggregator Factory Actor.
 */
export class ActorBindingsAggregatorFactoryExtensions extends ActorBindingsAggregatorFactory {
  public constructor(args: IActorBindingsAggregatorFactoryArgs) {
    super(args);
  }

  public async test({ context, expr }: IActionBindingsAggregatorFactory): Promise<TestResult<IActorTest>> {
    if (!this.getExtensionAggregator(context, expr)) {
      return failTest(`Actor ${this.name} can only provide aggregators for extension aggregates that are provided through config entries like: ${KeysInitQuery.extensionAggregatorCreator.name} or ${KeysInitQuery.extensionAggregators.name}`);
    }
    return passTestVoid();
  }

  public async run({ context, expr }: IActionBindingsAggregatorFactory):
  Promise<IActorBindingsAggregatorFactoryOutput> {
    // Extension aggregates are passed as named expressions instead of aggregate expressions
    const aggregate = <Algebra.BoundNamedAggregate> <unknown> expr;
    const evaluators = await Promise.all(aggregate.args.map(arg =>
      this.mediatorExpressionEvaluatorFactory.mediate({ algExpr: arg, context })));
    return this.getExtensionAggregator(context, expr)!({
      evaluateArguments: bindings => Promise.all(evaluators.map(evaluator => evaluator.evaluate(bindings))),
      distinct: aggregate.distinct,
    });
  }

  protected getExtensionAggregator(
    context: IActionContext,
    expr: Algebra.Expression,
  ): ExtensionAggregator | undefined {
    if (!isKnownSubType(expr, Algebra.ExpressionTypes.NAMED)) {
      return undefined;
    }
    const extensionAggregatorCreator = context.get(KeysInitQuery.extensionAggregatorCreator);
    if (extensionAggregatorCreator) {
      return extensionAggregatorCreator(expr.name);
    }
    return context.get(KeysInitQuery.extensionAggregators)?.[expr.name.value];
  }
}
