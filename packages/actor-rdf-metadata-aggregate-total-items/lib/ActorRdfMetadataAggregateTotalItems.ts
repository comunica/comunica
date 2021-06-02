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
    const output = action.quadPatternOutput;
    // Get the (sub)metadata from the quad pattern output data iterator
    const recordsPromise = new Promise<Record<string,any>[]>((resolve, reject)=>{
      try {
        output.data.getProperty('metadata', (subMetadata: Record<string, any>) => {
          // Create metadata record containing the totalItems from subMetadata and the corresponding source.
          const metadataRecord = {
            totalItems: subMetadata.totalItems,
            resolvedFrom:action.source
          }

          this.records.push(metadataRecord);
          resolve(this.records);
        });
      } catch (err) {
        console.error('Error while processing submetadata');
        reject(err)
      }
    })


    // Create a promise to the aggregated result (the total number of items from each metadata record)
    const metadataPromise = new Promise<Record<string, any>>(async (resolve,reject)=>{
      const resolvedRecords = await recordsPromise;
      const total = resolvedRecords.map(x=>x.totalItems).reduce((acc,val)=>acc+val);
      resolve ({
        totalItems: total, // this value may be altered by subsequent operations (e.g. the slice query operation)
        [this.name]: {
          totalItems: total,
          records: resolvedRecords
        }
      })
    })

    // Return the aggregated number of items and the actual metadata records
    return metadataPromise
  }
}
