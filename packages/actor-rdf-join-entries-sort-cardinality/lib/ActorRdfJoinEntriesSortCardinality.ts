import {
  ActorRdfJoinEntriesSort,
} from '@comunica/bus-rdf-join-entries-sort';
import type {
  IActionRdfJoinEntriesSort,
  IActorRdfJoinEntriesSortArgs,
  IActorRdfJoinEntriesSortOutput,
  IActorRdfJoinEntriesSortTest,
} from '@comunica/bus-rdf-join-entries-sort';
import type { TestResult } from '@comunica/core';
import { passTest } from '@comunica/core';

/**
 * An actor that sorts join entries by increasing cardinality.
 */
export class ActorRdfJoinEntriesSortCardinality extends ActorRdfJoinEntriesSort {
  public constructor(args: IActorRdfJoinEntriesSortArgs) {
    super(args);
  }

  public async test(action: IActionRdfJoinEntriesSort): Promise<TestResult<IActorRdfJoinEntriesSortTest>> {
    return passTest({
      accuracy: action.entries.length === 0 ?
        1 :
        action.entries
          .reduce((sum, entry) => sum + (Number.isFinite(entry.metadata.cardinality.value) ? 1 : 0), 0) /
        action.entries.length,
    });
  }

  public async run(action: IActionRdfJoinEntriesSort): Promise<IActorRdfJoinEntriesSortOutput> {
    const entries = [ ...action.entries ]
      .sort((entryLeft, entryRight) => entryLeft.metadata.cardinality.value - entryRight.metadata.cardinality.value);
    return { entries };
  }
}
