import type { IActionRdfJoinEntriesSort,
  IActorRdfJoinEntriesSortOutput } from '@comunica/bus-rdf-join-entries-sort';
import { ActorRdfJoinEntriesSort } from '@comunica/bus-rdf-join-entries-sort';
import type { IActorArgs, IActorTest } from '@comunica/core';

/**
 * An actor that sorts join entries by increasing cardinality.
 */
export class ActorRdfJoinEntriesSortCardinality extends ActorRdfJoinEntriesSort {
  public constructor(
    args: IActorArgs<IActionRdfJoinEntriesSort, IActorTest, IActorRdfJoinEntriesSortOutput>,
  ) {
    super(args);
  }

  public async test(action: IActionRdfJoinEntriesSort): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionRdfJoinEntriesSort): Promise<IActorRdfJoinEntriesSortOutput> {
    const entries = [ ...action.entries ]
      .sort((entryLeft, entryRight) => entryLeft.metadata.cardinality.value - entryRight.metadata.cardinality.value);
    return { entries };
  }
}
