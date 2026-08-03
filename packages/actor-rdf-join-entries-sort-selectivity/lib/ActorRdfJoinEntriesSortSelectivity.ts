import type {
  IActionRdfJoinEntriesSort,
  IActorRdfJoinEntriesSortOutput,
  IActorRdfJoinEntriesSortArgs,
  IActorRdfJoinEntriesSortTest,
} from '@comunica/bus-rdf-join-entries-sort';
import { ActorRdfJoinEntriesSort } from '@comunica/bus-rdf-join-entries-sort';
import type { MediatorRdfJoinSelectivity } from '@comunica/bus-rdf-join-selectivity';
import type { TestResult } from '@comunica/core';
import { passTest } from '@comunica/core';
import type { IJoinEntryWithMetadata } from '@comunica/types';

/**
 * A comunica Selectivity RDF Join Entries Sort Actor.
 */
export class ActorRdfJoinEntriesSortSelectivity extends ActorRdfJoinEntriesSort {
  public readonly mediatorJoinSelectivity: MediatorRdfJoinSelectivity;

  public constructor(args: IActorRdfJoinEntriesSortSelectivityArgs) {
    super(args);
    this.mediatorJoinSelectivity = args.mediatorJoinSelectivity;
  }

  public async test(_action: IActionRdfJoinEntriesSort): Promise<TestResult<IActorRdfJoinEntriesSortTest>> {
    return passTest({ accuracy: 0.501 });
  }

  public async run(action: IActionRdfJoinEntriesSort): Promise<IActorRdfJoinEntriesSortOutput> {
    const remainingEntries = [ ...action.entries ];
    const finalEntries: IJoinEntryWithMetadata[] = [];

    while (remainingEntries.length > 0) {
      let minSelectivity = Number.MAX_VALUE;
      let minEntryIndex = -1;
      for (const [ remainingEntryIndex, remainingEntry ] of remainingEntries.entries()) {
        const { selectivity } = await this.mediatorJoinSelectivity.mediate({
          entries: [ remainingEntry, ...finalEntries ],
          context: action.context,
        });
        if (selectivity < minSelectivity) {
          minSelectivity = selectivity;
          minEntryIndex = remainingEntryIndex;
        }
      }
      finalEntries.push(remainingEntries[minEntryIndex]);
      remainingEntries.splice(minEntryIndex, 1);
    }

    return { entries: finalEntries };
  }
}

export interface IActorRdfJoinEntriesSortSelectivityArgs extends IActorRdfJoinEntriesSortArgs {
  mediatorJoinSelectivity: MediatorRdfJoinSelectivity;
}
