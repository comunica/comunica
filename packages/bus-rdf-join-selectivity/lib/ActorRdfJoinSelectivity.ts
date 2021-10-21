import type { IJoinEntry } from '@comunica/bus-rdf-join';
import type { IAction, IActorArgs, IActorOutput } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { IMediatorTypeAccuracy } from '../../mediatortype-accuracy/lib/MediatorTypeAccuracy';

/**
 * A comunica actor for rdf-join-selectivity events.
 *
 * Actor types:
 * * Input:  IActionRdfJoinSelectivity:      Join entries.
 * * Test:   IMediatorTypeAccuracy:          The accuracy of the selectivity calculator.
 * * Output: IActorRdfJoinSelectivityOutput: The calculated join selectivity.
 *
 * @see IActionRdfJoinSelectivity
 * @see IActorRdfJoinSelectivityTest
 * @see IActorRdfJoinSelectivityOutput
 */
export abstract class ActorRdfJoinSelectivity
  extends Actor<IActionRdfJoinSelectivity, IMediatorTypeAccuracy, IActorRdfJoinSelectivityOutput> {
  public constructor(
    args: IActorArgs<IActionRdfJoinSelectivity, IMediatorTypeAccuracy, IActorRdfJoinSelectivityOutput>,
  ) {
    super(args);
  }
}

export interface IActionRdfJoinSelectivity extends IAction {
  /**
   * The array of streams to join.
   */
  entries: IJoinEntry[];
}

export interface IActorRdfJoinSelectivityOutput extends IActorOutput {
  /**
   * A selectivity factor in the range [0, 1].
   * A value close to 1 indicates a low selectivity,
   * which means that the operations in the join entries are highly unrelated.
   * A value close to 0 indicates a high selectivity,
   * which means that the operations in the join entries are highly related, and have a high chance of reducing .
   */
  selectivity: number;
}
