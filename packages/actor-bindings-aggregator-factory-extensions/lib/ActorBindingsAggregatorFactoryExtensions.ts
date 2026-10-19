import type {
  IActionBindingsAggregatorFactory,
  IActorBindingsAggregatorFactoryArgs,
  IActorBindingsAggregatorFactoryOutput,
} from '@comunica/bus-bindings-aggregator-factory';
import { ActorBindingsAggregatorFactory } from '@comunica/bus-bindings-aggregator-factory';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoidWithSideData } from '@comunica/core';
import type { ExtensionAggregator } from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { getExtensionAggregatorLookup } from '@comunica/utils-query-operation';
import { NamedAggregator } from './NamedAggregator';

/**
 * A comunica Extensions Bindings Aggregator Factory Actor.
 */
export class ActorBindingsAggregatorFactoryExtensions extends ActorBindingsAggregatorFactory<ExtensionAggregator> {
  private readonly algebraFactory = new AlgebraFactory();

  public constructor(args: IActorBindingsAggregatorFactoryArgs<ExtensionAggregator>) {
    super(args);
  }

  public async test({ context, expr }: IActionBindingsAggregatorFactory):
  Promise<TestResult<IActorTest, ExtensionAggregator>> {
    // Extension aggregates are passed as named expressions instead of aggregate expressions
    const expression: Algebra.Expression = expr;
    const extensionAggregator = this.algebraFactory.isBoundNamedAggregate(expression) ?
      getExtensionAggregatorLookup(context)?.(expression.name.value) :
      undefined;
    if (!extensionAggregator) {
      return failTest(`Actor ${this.name} can only provide aggregators for extension aggregates that are provided through config entries like: ${KeysInitQuery.extensionAggregatorCreator.name} or ${KeysInitQuery.extensionAggregators.name}`);
    }
    return passTestVoidWithSideData(extensionAggregator);
  }

  public async run(
    { context, expr }: IActionBindingsAggregatorFactory,
    extensionAggregator: ExtensionAggregator,
  ): Promise<IActorBindingsAggregatorFactoryOutput> {
    const aggregate = <Algebra.BoundNamedAggregate> <unknown> expr;
    const evaluators = await Promise.all(aggregate.args.map(arg =>
      this.mediatorExpressionEvaluatorFactory.mediate({ algExpr: arg, context })));
    return new NamedAggregator(
      aggregate.name.value,
      evaluators,
      aggregate.distinct,
      extensionAggregator(),
      (message, data) => this.logWarn(context, message, data),
    );
  }
}
