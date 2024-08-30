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
import { TermFunctionXsdToTime } from './TermFunctionXsdToTime';

/**
 * A comunica TermFunctionXsdToTime Function Factory Actor.
 */
export class ActorFunctionFactoryTermFunctionXsdToTime extends ActorFunctionFactory {
  public constructor(args: IActorFunctionFactoryArgs) {
    super(args);
  }

  public async test(action: IActionFunctionFactory): Promise<IActorTest> {
    if (action.functionName === TypeURL.XSD_TIME) {
      return true;
    }
    throw new Error(`Actor ${this.name} can only provide implementations for ${TypeURL.XSD_TIME}`);
  }

  public async run<T extends IActionFunctionFactory>(_: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    return new TermFunctionXsdToTime();
  }
}
