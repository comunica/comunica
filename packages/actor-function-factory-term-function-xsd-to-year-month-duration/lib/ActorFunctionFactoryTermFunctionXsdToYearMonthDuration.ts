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
import { TermFunctionXsdToYearMonthDuration } from './TermFunctionXsdToYearMonthDuration';

/**
 * A comunica TermFunctionXsdToYearMonthDuration Function Factory Actor.
 */
export class ActorFunctionFactoryTermFunctionXsdToYearMonthDuration extends ActorFunctionFactoryDedicated {
  public constructor(args: IActorFunctionFactoryArgs) {
    super(args, [ TypeURL.XSD_YEAR_MONTH_DURATION ], true);
  }

  public async run<T extends IActionFunctionFactory>(_: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
    return new TermFunctionXsdToYearMonthDuration();
  }
}
