import { ActorRdfMetadataAggregate, IActionRdfMetadataAggregate, IActorRdfMetadataAggregateOutput } from '@comunica/bus-rdf-metadata-aggregate';
import { IActorArgs, IActorTest } from '@comunica/core';
import {Record} from "immutable";

/**
 * A comunica Total Items RDF Metadata Aggregate Actor.
 */
export class ActorRdfMetadataAggregateTotalItems extends ActorRdfMetadataAggregate {
  public records: Record<string,any>[] = [];

  public constructor(args: IActorArgs<IActionRdfMetadataAggregate, IActorTest, IActorRdfMetadataAggregateOutput>) {
    super(args);
  }

  public async test(action: IActionRdfMetadataAggregate): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionRdfMetadataAggregate): Promise<IActorRdfMetadataAggregateOutput> {
    const {metadata, subMetadata} = action

    let newTotalItems: number = 0
    const isEmptyRecord = (r: Record<string, any>) => Object.keys(r).length === 0
    const hasTotalItems = (r: Record<string, any>) => r.totalItems !== undefined
    let resultRecord = {}

    if (!subMetadata) {
      // submetadata not defined
      resultRecord = metadata
    } else {
      // submetadata IS defined
      const metadataHasTotalItems = hasTotalItems(metadata)
      const subMetadataHasTotalItems = hasTotalItems(subMetadata)


      if (metadataHasTotalItems && subMetadataHasTotalItems) {
        // metadata has total items & submetadata has total items
        newTotalItems = metadata.totalItems + subMetadata.totalItems
      } else if (!metadataHasTotalItems && !subMetadataHasTotalItems) {
        // neither metadata or submetadata has totalItems
        newTotalItems = Number.POSITIVE_INFINITY
      } else if (!metadataHasTotalItems && subMetadata) {
        // metadata does not have total items
        newTotalItems = subMetadata.totalItems

      } else {
        if (isEmptyRecord(subMetadata)) {
          newTotalItems = Number.POSITIVE_INFINITY;
        } else {
          throw  Error('CASE NOT COVERED YET')
        }
      }
    }

    resultRecord = {
      ...subMetadata,
      ...metadata,
      totalItems: newTotalItems
    }

    return Promise.resolve(
        {
          aggregatedMetadata: {
            ...resultRecord
          }
        }
    )
  }
}
