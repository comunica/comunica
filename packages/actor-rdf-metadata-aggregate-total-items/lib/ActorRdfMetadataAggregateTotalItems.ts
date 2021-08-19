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

    let aggregatedMetadata: Record<string, any> = {};
    if (empty) {
      // Set metadata for an empty source
      aggregatedMetadata = { totalItems: 0 };
    } else if ((metadata === undefined) || !Number.isFinite(metadata.totalItems)) {
      // Set totalItems to infinity
      aggregatedMetadata = { ...metadata, ...subMetadata, totalItems: Number.POSITIVE_INFINITY };
    } else {
      // Set totalItems to the sum of metadata and subMetadata's totalItems
      aggregatedMetadata = { ...metadata,
        ...subMetadata,
        totalItems: Number(metadata.totalItems) + Number(subMetadata!.totalItems) };
    }

    return Promise.resolve({ aggregatedMetadata });
  }
}
