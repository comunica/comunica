import type {
  IActionFunctionFactory,
  IActorFunctionFactoryArgs,
  IActorFunctionFactoryOutput,
  IActorFunctionFactoryOutputTerm,
} from '@comunica/bus-function-factory';
import {
  ActorFunctionFactoryDedicated,
} from '@comunica/bus-function-factory';
import { TypeURL } from '@comunica/utils-expression-evaluator';
import { TermFunctionXsdToBoolean } from './TermFunctionXsdToBoolean';

/**
 * A comunica TermFunctionXsdToBoolean Function Factory Actor.
 */
export class ActorFunctionFactoryTermXsdToBoolean extends ActorFunctionFactoryDedicated {
  public constructor(args: IActorFunctionFactoryArgs) {
    super({
      ...args,
      functionNames: [ TypeURL.XSD_BOOLEAN ],
      termFunction: true,
    });
  }

  public async run<T extends IActionFunctionFactory>(_: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    return new TermFunctionXsdToBoolean();
  }
}
