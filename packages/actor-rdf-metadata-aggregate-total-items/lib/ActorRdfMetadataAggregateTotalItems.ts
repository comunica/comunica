import type { IActionRdfMetadataAggregate,
  IActorRdfMetadataAggregateOutput } from '@comunica/bus-rdf-metadata-aggregate';
import { ActorRdfMetadataAggregate } from '@comunica/bus-rdf-metadata-aggregate';
import type { IActorArgs, IActorTest } from '@comunica/core';
import type { Record } from 'immutable';

/**
 * A comunica Total Items RDF Metadata Aggregate Actor.
 */
export class ActorRdfMetadataAggregateTotalItems extends ActorRdfMetadataAggregate {
  public records: Record<string, any>[] = [];

  public constructor(args: IActorArgs<IActionRdfMetadataAggregate, IActorTest, IActorRdfMetadataAggregateOutput>) {
    super(args);
  }

  public async test(action: IActionRdfMetadataAggregate): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionRdfMetadataAggregate): Promise<IActorRdfMetadataAggregateOutput> {
    const { metadata, subMetadata } = action;

    let newTotalItems = 0;
    const hasTotalItems = (record: Record<string, any>): boolean => record.totalItems !== undefined;
    let resultRecord = {};

    // Submetadata IS defined
    const metadataHasTotalItems = hasTotalItems(metadata);
    const subMetadataHasTotalItems = hasTotalItems(subMetadata!);

    if (metadataHasTotalItems && subMetadataHasTotalItems) {
      // Metadata has total items & submetadata has total items
      newTotalItems = Number(metadata.totalItems) + Number(subMetadata!.totalItems);
    } else if (!metadataHasTotalItems && !subMetadataHasTotalItems) {
      // Neither metadata or submetadata has totalItems
      newTotalItems = Number.POSITIVE_INFINITY;
    } else {
      // Metadata does not have total items
      newTotalItems = subMetadata!.totalItems;
    }

    resultRecord = {
      ...subMetadata,
      ...metadata,
      totalItems: newTotalItems,
    };

    return Promise.resolve(
      {
        aggregatedMetadata: {
          ...resultRecord,
        },
      },
    );
  }
}
