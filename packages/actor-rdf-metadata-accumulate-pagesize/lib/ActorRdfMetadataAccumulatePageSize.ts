import type { IActionRdfMetadataAccumulate, IActorRdfMetadataAccumulateOutput,
  IActorRdfMetadataAccumulateArgs } from '@comunica/bus-rdf-metadata-accumulate';
import { ActorRdfMetadataAccumulate } from '@comunica/bus-rdf-metadata-accumulate';
import type { IActorTest } from '@comunica/core';

/**
 * A comunica PageSize RDF Metadata Accumulate Actor.
 */
export class ActorRdfMetadataAccumulatePageSize extends ActorRdfMetadataAccumulate {
  public constructor(args: IActorRdfMetadataAccumulateArgs) {
    super(args);
  }

  public async test(action: IActionRdfMetadataAccumulate): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionRdfMetadataAccumulate): Promise<IActorRdfMetadataAccumulateOutput> {
    // Return nothing on initialize
    if (action.mode === 'initialize') {
      return { metadata: {}};
    }

    // Otherwise, attempt to increment existing value
    return {
      metadata: {
        ...('pageSize' in action.accumulatedMetadata) || ('pageSize' in action.appendingMetadata) ?
          {
            pageSize: (action.accumulatedMetadata.pageSize || 0) + (action.appendingMetadata.pageSize || 0),
          } :
          {},
      },
    };
  }
}
