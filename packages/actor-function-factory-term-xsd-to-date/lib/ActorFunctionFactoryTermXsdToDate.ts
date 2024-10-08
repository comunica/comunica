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
import { TermFunctionXsdToDate } from './TermFunctionXsdToDate';

/**
 * A comunica TermFunctionXsdToDate Function Factory Actor.
 */
export class ActorFunctionFactoryTermXsdToDate extends ActorFunctionFactoryDedicated {
  public constructor(args: IActorFunctionFactoryArgs) {
    super({
      ...args,
      functionNames: [ TypeURL.XSD_DATE ],
      termFunction: true,
    });
  }

  public async run<T extends IActionFunctionFactory>(_: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    return new TermFunctionXsdToDate();
  }
}
