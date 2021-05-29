import { ActorRdfMetadataAggregate, IActionRdfMetadataAggregate, IActorRdfMetadataAggregateOutput } from '@comunica/bus-rdf-metadata-aggregate';
import { IActorArgs, IActorTest } from '@comunica/core';

/**
 * A comunica Total Items RDF Metadata Aggregate Actor.
 */
export class ActorRdfMetadataAggregateTotalItems extends ActorRdfMetadataAggregate {
  public constructor(args: IActorArgs<IActionRdfMetadataAggregate, IActorTest, IActorRdfMetadataAggregateOutput>) {
    super(args);
    console.log('initialized !! ActorRdfMetadataAggregateTotalItems()')

  }

  public async test(action: IActionRdfMetadataAggregate): Promise<IActorTest> {
    console.log('@ActorRdfMetadataAggregateTotalItems.test()')

    return true; // TODO implement
  }

  public async run(action: IActionRdfMetadataAggregate): Promise<IActorRdfMetadataAggregateOutput> {
    console.log('@ActorRdfMetadataAggregateTotalItems.run()')

    return true; // TODO implement
  }
}
