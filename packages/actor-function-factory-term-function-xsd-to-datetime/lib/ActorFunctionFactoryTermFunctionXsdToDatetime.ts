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
import { TermFunctionXsdToDatetime } from './TermFunctionXsdToDatetime';

/**
 * A comunica TermFunctionXsdToDatetime Function Factory Actor.
 */
export class ActorFunctionFactoryTermFunctionXsdToDatetime extends ActorFunctionFactoryDedicated {
  public constructor(args: IActorFunctionFactoryArgs) {
    super(args, [ TypeURL.XSD_DATE_TIME ], true);
  }

  public async run<T extends IActionFunctionFactory>(_: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    return new TermFunctionXsdToDatetime();
  }
}
