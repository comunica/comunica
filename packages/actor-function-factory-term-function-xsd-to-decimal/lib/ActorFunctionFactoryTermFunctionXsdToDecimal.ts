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
import { TermFunctionXsdToDecimal } from './TermFunctionXsdToDecimal';

/**
 * A comunica TermFunctionXsdToDecimal Function Factory Actor.
 */
export class ActorFunctionFactoryTermFunctionXsdToDecimal extends ActorFunctionFactoryDedicated {
  public constructor(args: IActorFunctionFactoryArgs) {
    super(args, [ TypeURL.XSD_DECIMAL ], true);
  }

  public async run<T extends IActionFunctionFactory>(_: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    return new TermFunctionXsdToDecimal();
  }
}
