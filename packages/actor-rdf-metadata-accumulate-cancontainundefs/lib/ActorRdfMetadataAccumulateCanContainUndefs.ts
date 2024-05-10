import type {
  IActionRdfMetadataAccumulate,
  IActorRdfMetadataAccumulateOutput,
  IActorRdfMetadataAccumulateArgs,
} from '@comunica/bus-rdf-metadata-accumulate';
import { ActorRdfMetadataAccumulate } from '@comunica/bus-rdf-metadata-accumulate';
import type { IActorTest } from '@comunica/core';

/**
 * A comunica CanContainUndefs RDF Metadata Accumulate Actor.
 */
export class ActorRdfMetadataAccumulateCanContainUndefs extends ActorRdfMetadataAccumulate {
  public constructor(args: IActorRdfMetadataAccumulateArgs) {
    super(args);
  }

  public async test(_action: IActionRdfMetadataAccumulate): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionRdfMetadataAccumulate): Promise<IActorRdfMetadataAccumulateOutput> {
    // Return default value on initialize
    if (action.mode === 'initialize') {
      return { metadata: { canContainUndefs: false }};
    }

    // Otherwise, attempt to increment existing value
    let canContainUndefs = action.accumulatedMetadata.canContainUndefs;
    if (action.appendingMetadata.canContainUndefs) {
      canContainUndefs = true;
    }
    return { metadata: { canContainUndefs }};
  }
}
