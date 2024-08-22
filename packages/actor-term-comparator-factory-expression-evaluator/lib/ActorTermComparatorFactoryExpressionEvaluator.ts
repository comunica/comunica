import { InternalEvaluator } from '@comunica/actor-expression-evaluator-factory-default/lib/InternalEvaluator';
import { BindingsFactory } from '@comunica/bindings-factory';
import type {
  IActionTermComparatorFactory,
  IActorTermComparatorFactoryOutput,
} from '@comunica/bus-term-comparator-factory';
import { ActorTermComparatorFactory } from '@comunica/bus-term-comparator-factory';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
import * as Eval from '@comunica/expression-evaluator';
import { TermComparatorExpressionEvaluator } from './TermComparatorExpressionEvaluator';

/**
 * A comunica Expression Evaluator Based Term Comparator Factory Actor.
 */
export class ActorTermComparatorFactoryExpressionEvaluator extends ActorTermComparatorFactory {
  public async test(_action: IActionTermComparatorFactory): Promise<IActorTest> {
    return true;
  }

  /**
   * Context item superTypeProvider can be expected here
   * @param context IActionTermComparatorFactory
   * @param context.context IActionContext
   */
  public async run({ context }: IActionTermComparatorFactory): Promise<IActorTermComparatorFactoryOutput> {
    context = Eval.prepareEvaluatorActionContext(context);
    return new TermComparatorExpressionEvaluator(
      new InternalEvaluator(
        context,
        this.mediatorFunctionFactory,
        this.mediatorQueryOperation,
        await BindingsFactory.create(
          this.mediatorMergeBindingsContext,
          context,
          context.getSafe(KeysInitQuery.dataFactory),
        ),
      ),
      await this.mediatorFunctionFactory
        .mediate({ functionName: Eval.SparqlOperator.EQUAL, context, requireTermExpression: true }),
      await this.mediatorFunctionFactory
        .mediate({ functionName: Eval.SparqlOperator.LT, context, requireTermExpression: true }),
    );
  }
}
