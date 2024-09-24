import type {
  IActionFunctionFactory,
  IActorFunctionFactoryArgs,
  IActorFunctionFactoryOutput,
  IActorFunctionFactoryOutputTerm,
} from '@comunica/bus-function-factory';
import {
  ActorFunctionFactoryDedicated,
} from '@comunica/bus-function-factory';

import { TypeURL } from '@comunica/expression-evaluator';
import { TermFunctionXsdToDayTimeDuration } from './TermFunctionXsdToDayTimeDuration';

/**
 * A comunica TermFunctionXsdToDayTimeDuration Function Factory Actor.
 */
export class ActorFunctionFactoryTermFunctionXsdToDayTimeDuration extends ActorFunctionFactoryDedicated {
  public constructor(args: IActorFunctionFactoryArgs) {
    super({
      ...args,
      functionNames: [ TypeURL.XSD_DAY_TIME_DURATION ],
      termFunction: true,
    });
  }

  public async run<T extends IActionFunctionFactory>(_: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    return new TermFunctionXsdToDayTimeDuration();
  }
}
