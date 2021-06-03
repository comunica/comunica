import { ActorRdfMetadataAggregate, IActionRdfMetadataAggregate, IActorRdfMetadataAggregateOutput } from '@comunica/bus-rdf-metadata-aggregate';
import { IActorArgs, IActorTest } from '@comunica/core';

/**
 * A comunica Total Items RDF Metadata Aggregate Actor.
 */
export class ActorRdfMetadataAggregateTotalItems extends ActorRdfMetadataAggregate {
  public records: Record<string,any>[] = [];

  public constructor(args: IActorArgs<IActionRdfMetadataAggregate, IActorTest, IActorRdfMetadataAggregateOutput>) {
    super(args);
  }

  public async test(action: IActionRdfMetadataAggregate): Promise<IActorTest> {
    return true; // TODO implement
  }

  public async run(action: IActionRdfMetadataAggregate): Promise<IActorRdfMetadataAggregateOutput> {
    const { metadata, subMetadata } = action;
    let totalItems = metadata.totalItems;
    let subTotalItems = subMetadata.totalItems;

    if ((!subMetadata.totalItems && subMetadata.totalItems !== 0) || !Number.isFinite(subMetadata.totalItems))
      totalItems = Number.POSITIVE_INFINITY;

    // The metadata doesn't have a totalItems property, totalItems will be undefined.
    // Depending on whether the sub metadata contains a totalItems property,
    // we set it to either that totalItems value or zero
    if (!totalItems)
      totalItems = subTotalItems ? subTotalItems : 0
    else
      totalItems += subMetadata.totalItems;

    return {
      metadata: { ...metadata, totalItems }
    };
  }
}
