import type {
  IActionExpressionEvaluatorFactory,
  IActorExpressionEvaluatorFactoryArgs,
  IActorExpressionEvaluatorFactoryOutput,
} from '@comunica/bus-expression-evaluator-factory';
import { ActorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';

import type { IActorTest } from '@comunica/core';

import { prepareEvaluatorActionContext } from '@comunica/expression-evaluator/lib/util/Context';
import { AlgebraTransformer } from './AlgebraTransformer';
import { ExpressionEvaluator } from './ExpressionEvaluator';

/**
 * A comunica Default Expression Evaluator Factory Actor.
 */
export class ActorExpressionEvaluatorFactoryDefault extends ActorExpressionEvaluatorFactory {
  public constructor(args: IActorExpressionEvaluatorFactoryArgs) {
    super(args);
  }

  public async test(action: IActionExpressionEvaluatorFactory): Promise<IActorTest> {
    return true;
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
    );
  }
}
