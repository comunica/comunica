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
import { TermFunctionXsdToFloat } from './TermFunctionXsdToFloat';

/**
 * A comunica TermFunctionXsdToFloat Function Factory Actor.
 */
export class ActorFunctionFactoryTermFunctionXsdToFloat extends ActorFunctionFactoryDedicated {
  public constructor(args: IActorFunctionFactoryArgs) {
    super(args, [ TypeURL.XSD_FLOAT ], true);
  }

  public async run<T extends IActionFunctionFactory>(_: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    return new TermFunctionXsdToFloat();
  }
}
