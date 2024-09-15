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
import { TermFunctionXsdToInteger } from './TermFunctionXsdToInteger';

/**
 * A comunica TermFunctionXsdToInteger Function Factory Actor.
 */
export class ActorFunctionFactoryTermFunctionXsdToInteger extends ActorFunctionFactoryDedicated {
  public constructor(args: IActorFunctionFactoryArgs) {
    super(args, [ TypeURL.XSD_INTEGER ], true);
  }

  public async run<T extends IActionFunctionFactory>(_: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    return new TermFunctionXsdToInteger();
  }
}
