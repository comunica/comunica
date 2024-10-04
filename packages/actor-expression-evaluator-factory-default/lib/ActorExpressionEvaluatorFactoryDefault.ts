import type {
  IActionExpressionEvaluatorFactory,
  IActorExpressionEvaluatorFactoryArgs,
  IActorExpressionEvaluatorFactoryOutput,
} from '@comunica/bus-expression-evaluator-factory';
import { ActorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import { prepareEvaluatorActionContext } from '@comunica/expression-evaluator';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { AlgebraTransformer } from './AlgebraTransformer';
import { ExpressionEvaluator } from './ExpressionEvaluator';

/**
 * A comunica Default Expression Evaluator Factory Actor.
 */
export class ActorExpressionEvaluatorFactoryDefault extends ActorExpressionEvaluatorFactory {
  public constructor(args: IActorExpressionEvaluatorFactoryArgs) {
    super(args);
  }

  public async test(_action: IActionExpressionEvaluatorFactory): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionExpressionEvaluatorFactory): Promise<IActorExpressionEvaluatorFactoryOutput> {
    const fullContext = prepareEvaluatorActionContext(action.context);
    return new ExpressionEvaluator(
      fullContext,
      await new AlgebraTransformer(
        fullContext,
        this.mediatorFunctionFactory,
      ).transformAlgebra(action.algExpr),
      this.mediatorFunctionFactory,
      this.mediatorQueryOperation,
      await BindingsFactory.create(
        this.mediatorMergeBindingsContext,
        action.context,
        action.context.getSafe(KeysInitQuery.dataFactory),
      ),
    );
  }
}
