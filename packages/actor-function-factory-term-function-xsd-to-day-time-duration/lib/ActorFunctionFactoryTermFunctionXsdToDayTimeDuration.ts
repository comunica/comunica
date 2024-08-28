import type {
  IActionFunctionFactory,
  IActorFunctionFactoryArgs,
  IActorFunctionFactoryOutput,
  IActorFunctionFactoryOutputTerm,
} from '@comunica/bus-function-factory';
import {
  ActorFunctionFactory,
} from '@comunica/bus-function-factory';
import type { IActorTest } from '@comunica/core';
import { TypeURL } from '@comunica/expression-evaluator';
import { TermFunctionXsdToDayTimeDuration } from './TermFunctionXsdToDayTimeDuration';

/**
 * A comunica TermFunctionXsdToDayTimeDuration Function Factory Actor.
 */
export class ActorFunctionFactoryTermFunctionXsdToDayTimeDuration extends ActorFunctionFactory {
  public constructor(args: IActorFunctionFactoryArgs) {
    super(args);
  }

  public async test(action: IActionFunctionFactory): Promise<IActorTest> {
    if (action.functionName === TypeURL.XSD_DAY_TIME_DURATION) {
      return true;
    }
    throw new Error(`Actor ${this.name} can only provide implementations for ${TypeURL.XSD_DAY_TIME_DURATION}`);
  }

  public async run<T extends IActionFunctionFactory>(_: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    return new TermFunctionXsdToDayTimeDuration();
  }
}
