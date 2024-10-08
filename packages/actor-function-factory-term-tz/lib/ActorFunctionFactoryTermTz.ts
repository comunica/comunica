import type {
  IActionFunctionFactory,
  IActorFunctionFactoryArgs,
  IActorFunctionFactoryOutput,
  IActorFunctionFactoryOutputTerm,
} from '@comunica/bus-function-factory';
import {
  ActorFunctionFactoryDedicated,
} from '@comunica/bus-function-factory';
import { SparqlOperator } from '@comunica/utils-expression-evaluator';
import { TermFunctionTz } from './TermFunctionTz';

/**
 * A comunica TermFunctionTz Function Factory Actor.
 */
export class ActorFunctionFactoryTermTz extends ActorFunctionFactoryDedicated {
  public constructor(args: IActorFunctionFactoryArgs) {
    super({
      ...args,
      functionNames: [ SparqlOperator.TZ ],
      termFunction: true,
    });
  }

  public async run<T extends IActionFunctionFactory>(_: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    return new TermFunctionTz();
  }
}
