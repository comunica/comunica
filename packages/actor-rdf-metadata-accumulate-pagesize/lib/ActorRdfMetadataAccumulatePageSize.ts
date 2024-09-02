import type {
  IActionRdfMetadataAccumulate,
  IActorRdfMetadataAccumulateOutput,
  IActorRdfMetadataAccumulateArgs,
} from '@comunica/bus-rdf-metadata-accumulate';
import { ActorRdfMetadataAccumulate } from '@comunica/bus-rdf-metadata-accumulate';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';

/**
 * A comunica PageSize RDF Metadata Accumulate Actor.
 */
export class ActorRdfMetadataAccumulatePageSize extends ActorRdfMetadataAccumulate {
  public constructor(args: IActorRdfMetadataAccumulateArgs) {
    super(args);
  }

  public async test(_action: IActionRdfMetadataAccumulate): Promise<TestResult<IActorTest>> {
    return passTestVoid();
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
              pageSize: (action.accumulatedMetadata.pageSize ?? 0) + (action.appendingMetadata.pageSize ?? 0),
            } :
            {},
      },
    };
  }
}
