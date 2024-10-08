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
import { TermFunctionIsLiteral } from './TermFunctionIsLiteral';

/**
 * A comunica TermFunctionIsLiteral Function Factory Actor.
 */
export class ActorFunctionFactoryTermIsLiteral extends ActorFunctionFactoryDedicated {
  public constructor(args: IActorFunctionFactoryArgs) {
    super({
      ...args,
      functionNames: [ SparqlOperator.IS_LITERAL ],
      termFunction: true,
    });
  }

  public async run<T extends IActionFunctionFactory>(_: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    return new TermFunctionIsLiteral();
  }
}
