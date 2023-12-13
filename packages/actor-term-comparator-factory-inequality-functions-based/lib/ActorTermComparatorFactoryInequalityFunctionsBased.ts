import {
  MockFunctionMediator,
  prepareEvaluatorActionContext,
} from '@comunica/actor-expression-evaluator-factory-base';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import type {
  IActionTermComparatorFactory,
  IActorTermComparatorFactoryOutput,
  IActorTermComparatorFactoryArgs,
} from '@comunica/bus-term-comparator-factory';
import { ActorTermComparatorFactory } from '@comunica/bus-term-comparator-factory';
import type { IActorTest } from '@comunica/core';
import { RegularOperator } from '@comunica/expression-evaluator';
import { InternalEvaluator } from '@comunica/expression-evaluator/lib/evaluators/InternalEvaluator';
import type { IMediatorFunctions } from '@comunica/types';
import { InequalityFunctionBasedComparator } from './InequalityFunctionBasedComparator';

/**
 * A comunica Inequality Functions Based Term Comparator Factory Actor.
 */
export class ActorTermComparatorFactoryInequalityFunctionsBased extends ActorTermComparatorFactory {
  private readonly mediatorQueryOperation: MediatorQueryOperation;
  private readonly mediatorFunctions: IMediatorFunctions;
  public constructor(args: IActorTermComparatorFactoryArgs) {
    super(args);
    this.mediatorQueryOperation = args.mediatorQueryOperation;

    // TODO: the or should be removed after bussification
    this.mediatorFunctions = args.mediatorFunctions || MockFunctionMediator;
  }

  public async test(action: IActionTermComparatorFactory): Promise<IActorTest> {
    return true;
  }

  /**
   * Context item superTypeProvider can be expected here
   * @param context
   */
  public async run({ context }: IActionTermComparatorFactory): Promise<IActorTermComparatorFactoryOutput> {
    return new InequalityFunctionBasedComparator(
      new InternalEvaluator(prepareEvaluatorActionContext(context,
        this.mediatorQueryOperation,
        this.mediatorFunctions)),
      await this.mediatorFunctions
        .mediate({ functionName: RegularOperator.EQUAL, context, requireTermExpression: true }),
      await this.mediatorFunctions
        .mediate({ functionName: RegularOperator.LT, context, requireTermExpression: true }),
    );
  }
}
