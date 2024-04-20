import type {
  MediatorBindingsAggregatorFactory,
} from '@comunica/bus-bindings-aggeregator-factory';
import type {
  IActionExpressionEvaluatorFactory,
  IActorExpressionEvaluatorFactoryArgs,
  IActorExpressionEvaluatorFactoryOutput,
} from '@comunica/bus-expression-evaluator-factory';
import { ActorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import type {
  MediatorFunctions,
} from '@comunica/bus-functions';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import type { MediatorTermComparatorFactory } from '@comunica/bus-term-comparator-factory';
import type { IActorTest } from '@comunica/core';

import { prepareEvaluatorActionContext } from '@comunica/expression-evaluator/lib/util/Context';
import { AlgebraTransformer } from './AlgebraTransformer';
import { ExpressionEvaluator } from './ExpressionEvaluator';

/**
 * A comunica Base Expression Evaluator Factory Actor.
 */
export class ActorExpressionEvaluatorFactoryBase extends ActorExpressionEvaluatorFactory {
  public readonly mediatorBindingsAggregatorFactory: MediatorBindingsAggregatorFactory;
  public readonly mediatorQueryOperation: MediatorQueryOperation;
  public readonly mediatorTermComparatorFactory: MediatorTermComparatorFactory;
  public readonly mediatorFunctions: MediatorFunctions;

  public constructor(args: IActorExpressionEvaluatorFactoryArgs) {
    super(args);
    this.mediatorQueryOperation = args.mediatorQueryOperation;
    this.mediatorBindingsAggregatorFactory = args.mediatorBindingsAggregatorFactory;
    this.mediatorTermComparatorFactory = args.mediatorTermComparatorFactory;
    this.mediatorFunctions = <MediatorFunctions> args.mediatorFunctions;
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
        this.mediatorFunctions,
      ).transformAlgebra(action.algExpr),
      this.mediatorFunctions,
      this.mediatorQueryOperation,
    );
  }
}
