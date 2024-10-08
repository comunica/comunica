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
import { TermFunctionIsBlank } from './TermFunctionIsBlank';

/**
 * A comunica TermFunctionIsBlank Function Factory Actor.
 */
export class ActorFunctionFactoryTermFunctionIsBlank extends ActorFunctionFactoryDedicated {
  public constructor(args: IActorFunctionFactoryArgs) {
    super({
      ...args,
      functionNames: [ SparqlOperator.IS_BLANK ],
      termFunction: true,
    });
  }

  public async run<T extends IActionFunctionFactory>(_: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    return new TermFunctionIsBlank();
  }
}
