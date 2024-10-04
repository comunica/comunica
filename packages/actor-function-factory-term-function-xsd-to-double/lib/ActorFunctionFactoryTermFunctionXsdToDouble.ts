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
import { TermFunctionXsdToDouble } from './TermFunctionXsdToDouble';

/**
 * A comunica TermFunctionXsdToDouble Function Factory Actor.
 */
export class ActorFunctionFactoryTermFunctionXsdToDouble extends ActorFunctionFactoryDedicated {
  public constructor(args: IActorFunctionFactoryArgs) {
    super({
      ...args,
      functionNames: [ TypeURL.XSD_DOUBLE ],
      termFunction: true,
    });
  }

  public async run<T extends IActionFunctionFactory>(_: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    return new TermFunctionXsdToDouble();
  }
}
