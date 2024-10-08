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
import { TermFunctionAbs } from './TermFunctionAbs';

/**
 * A comunica TermFunctionAbs Function Factory Actor.
 */
export class ActorFunctionFactoryTermFunctionAbs extends ActorFunctionFactoryDedicated {
  public constructor(args: IActorFunctionFactoryArgs) {
    super({
      ...args,
      functionNames: [ SparqlOperator.ABS ],
      termFunction: true,
    });
  }

  public async run<T extends IActionFunctionFactory>(_: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    return new TermFunctionAbs();
  }
}
