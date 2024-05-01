import { InternalEvaluator } from '@comunica/actor-expression-evaluator-factory-default/lib/InternalEvaluator';
import type { MediatorFunctionFactory } from '@comunica/bus-function-factory';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import type {
  IActionTermComparatorFactory,
  IActorTermComparatorFactoryOutput,
  IActorTermComparatorFactoryArgs,
} from '@comunica/bus-term-comparator-factory';
import { ActorTermComparatorFactory } from '@comunica/bus-term-comparator-factory';
import type { IActorTest } from '@comunica/core';
import { RegularOperator } from '@comunica/expression-evaluator';
import { prepareEvaluatorActionContext } from '@comunica/expression-evaluator/lib/util/Context';
import { TermComparatorExpressionEvaluator } from './TermComparatorExpressionEvaluator';

/**
 * A comunica Expression Evaluator Based Term Comparator Factory Actor.
 */
export class ActorTermComparatorFactoryExpressionEvaluator extends ActorTermComparatorFactory {
  private readonly mediatorQueryOperation: MediatorQueryOperation;
  private readonly mediatorFunctionFactory: MediatorFunctionFactory;
  public constructor(args: IActorTermComparatorFactoryArgs) {
    super(args);
    this.mediatorQueryOperation = args.mediatorQueryOperation;
    this.mediatorFunctionFactory = <MediatorFunctionFactory> args.mediatorFunctionFactory;
  }

  public async test(action: IActionTermComparatorFactory): Promise<IActorTest> {
    return true;
  }

  /**
   * Context item superTypeProvider can be expected here
   * @param context
   */
  public async run({ context }: IActionTermComparatorFactory): Promise<IActorTermComparatorFactoryOutput> {
    context = prepareEvaluatorActionContext(context);
    return new TermComparatorExpressionEvaluator(
      new InternalEvaluator(
        context,
        this.mediatorFunctionFactory,
        this.mediatorQueryOperation,
      ),
      await this.mediatorFunctionFactory
        .mediate({ functionName: RegularOperator.EQUAL, context, requireTermExpression: true }),
      await this.mediatorFunctionFactory
        .mediate({ functionName: RegularOperator.LT, context, requireTermExpression: true }),
    );
  }
}
