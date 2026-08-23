import type {
  IActionExpressionEvaluatorFactory,
  IActorExpressionEvaluatorFactoryArgs,
  IActorExpressionEvaluatorFactoryOutput,
} from '@comunica/bus-expression-evaluator-factory';
import { ActorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { ISuperTypeProvider } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { createSuperTypeProvider, prepareEvaluatorActionContext } from '@comunica/utils-expression-evaluator';
import { AlgebraTransformer } from './AlgebraTransformer';
import { ExpressionEvaluator } from './ExpressionEvaluator';

/**
 * A comunica Default Expression Evaluator Factory Actor.
 */
export class ActorExpressionEvaluatorFactoryDefault extends ActorExpressionEvaluatorFactory {
  /**
   * The super type provider handed to every evaluator that does not get one from the context.
   * It holds a type cache, so it is created once per actor instead of once per evaluator.
   */
  private readonly defaultSuperTypeProvider: ISuperTypeProvider;

  public constructor(args: IActorExpressionEvaluatorFactoryArgs) {
    super(args);
    this.defaultSuperTypeProvider = createSuperTypeProvider();
  }

  public async test(_action: IActionExpressionEvaluatorFactory): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionExpressionEvaluatorFactory): Promise<IActorExpressionEvaluatorFactoryOutput> {
    const fullContext = prepareEvaluatorActionContext(action.context, this.defaultSuperTypeProvider);
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
