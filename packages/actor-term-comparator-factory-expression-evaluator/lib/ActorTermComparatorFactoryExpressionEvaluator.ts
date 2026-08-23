import { InternalEvaluator } from '@comunica/actor-expression-evaluator-factory-default';
import type {
  IActionTermComparatorFactory,
  IActorTermComparatorFactoryOutput,
} from '@comunica/bus-term-comparator-factory';
import { ActorTermComparatorFactory } from '@comunica/bus-term-comparator-factory';
import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import * as Eval from '@comunica/utils-expression-evaluator';
import { TermComparatorExpressionEvaluator } from './TermComparatorExpressionEvaluator';

/**
 * A comunica Expression Evaluator Based Term Comparator Factory Actor.
 */
export class ActorTermComparatorFactoryExpressionEvaluator extends ActorTermComparatorFactory {
  /**
   * The super type provider handed to every comparator that does not get one from the context.
   * It holds a type cache, so it is created once per actor instead of once per comparator.
   */
  private readonly defaultSuperTypeProvider = Eval.createSuperTypeProvider();

  public async test(_action: IActionTermComparatorFactory): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  /**
   * Context item superTypeProvider can be expected here
   * @param context IActionTermComparatorFactory
   * @param context.context IActionContext
   */
  public async run({ context }: IActionTermComparatorFactory): Promise<IActorTermComparatorFactoryOutput> {
    context = Eval.prepareEvaluatorActionContext(context, this.defaultSuperTypeProvider)
      .set(KeysExpressionEvaluator.nonLexicalComparison, true)
      .set(KeysExpressionEvaluator.fullTermComparison, true);
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
