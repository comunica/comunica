import type { IActionRdfMetadataAggregate,
  IActorRdfMetadataAggregateOutput } from '@comunica/bus-rdf-metadata-aggregate';
import { ActorRdfMetadataAggregate } from '@comunica/bus-rdf-metadata-aggregate';
import type { IActorArgs, IActorTest } from '@comunica/core';

/**
 * A comunica Total Items RDF Metadata Aggregate Actor.
 */
export class ActorRdfMetadataAggregateTotalItems extends ActorRdfMetadataAggregate {
  public constructor(args: IActorArgs<IActionRdfMetadataAggregate, IActorTest, IActorRdfMetadataAggregateOutput>) {
    super(args);
  }

  public async test(action: IActionRdfMetadataAggregate): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionRdfMetadataAggregate): Promise<IActorRdfMetadataAggregateOutput> {
    const { metadata, subMetadata, empty } = action;

    if (empty) {
      return Promise.resolve({ aggregatedMetadata: { totalItems: 0 }});
    }

    let newTotalItems = 0;
    const hasTotalItems =
        (record: Record<string, any> | undefined): boolean => Boolean(record) && record!.totalItems !== undefined;
    let resultRecord = {};

    // Submetadata IS defined
    const metadataHasTotalItems = hasTotalItems(metadata);
    const subMetadataHasTotalItems = hasTotalItems(subMetadata);

    if (!metadataHasTotalItems || !subMetadataHasTotalItems) {
      // Neither metadata or submetadata has totalItems
      newTotalItems = Number.POSITIVE_INFINITY;
    } else {
      // Metadata has total items & submetadata has total items
      newTotalItems = Number(metadata!.totalItems) + Number(subMetadata!.totalItems);
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
