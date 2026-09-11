import type { MediatorBindingsAggregatorFactory } from '@comunica/bus-bindings-aggregator-factory';
import type { MediatorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import type { IActionInit, IActorInitArgs, IActorOutputInit } from '@comunica/bus-init';
import { ActorInit } from '@comunica/bus-init';
import type { MediatorTermComparatorFactory } from '@comunica/bus-term-comparator-factory';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';

/**
 * The entrypoint of a compiled expression evaluation config.
 * It only holds the mediators needed for expression evaluation, and is wrapped by an ExpressionEngine.
 */
export class ActorInitExpressions extends ActorInit {
  public readonly mediatorExpressionEvaluatorFactory: MediatorExpressionEvaluatorFactory;
  public readonly mediatorTermComparatorFactory: MediatorTermComparatorFactory;
  public readonly mediatorBindingsAggregatorFactory: MediatorBindingsAggregatorFactory;

  public constructor(args: IActorInitExpressionsArgs) {
    super(args);
    this.mediatorExpressionEvaluatorFactory = args.mediatorExpressionEvaluatorFactory;
    this.mediatorTermComparatorFactory = args.mediatorTermComparatorFactory;
    this.mediatorBindingsAggregatorFactory = args.mediatorBindingsAggregatorFactory;
  }

  public async test(_action: IActionInit): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(_action: IActionInit): Promise<IActorOutputInit> {
    throw new Error('ActorInitExpressions#run is not supported, use an ExpressionEngine instead.');
  }
}

export interface IActorInitExpressionsArgs extends IActorInitArgs {
  /**
   * The expression evaluator factory mediator
   */
  mediatorExpressionEvaluatorFactory: MediatorExpressionEvaluatorFactory;
  /**
   * The term comparator factory mediator
   */
  mediatorTermComparatorFactory: MediatorTermComparatorFactory;
  /**
   * The bindings aggregator factory mediator
   */
  mediatorBindingsAggregatorFactory: MediatorBindingsAggregatorFactory;
}
