import type { IActionRdfMetadataAccumulate, IActorRdfMetadataAccumulateOutput,
  IActorRdfMetadataAccumulateArgs } from '@comunica/bus-rdf-metadata-accumulate';
import { ActorRdfMetadataAccumulate } from '@comunica/bus-rdf-metadata-accumulate';
import type { IActorTest } from '@comunica/core';
import type * as RDF from '@rdfjs/types';

/**
 * A comunica Cardinality RDF Metadata Accumulate Actor.
 */
export class ActorRdfMetadataAccumulateCardinality extends ActorRdfMetadataAccumulate {
  public constructor(args: IActorRdfMetadataAccumulateArgs) {
    super(args);
  }

  public async test(action: IActionRdfMetadataAccumulate): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionRdfMetadataAccumulate): Promise<IActorRdfMetadataAccumulateOutput> {
    // Return default value on initialize
    if (action.mode === 'initialize') {
      return { metadata: { cardinality: { type: 'exact', value: 0 }}};
    }

    // Otherwise, attempt to update existing value
    const cardinality: RDF.QueryResultCardinality = { ...action.accumulatedMetadata.cardinality };

    if (!action.appendingMetadata.cardinality || !Number.isFinite(action.appendingMetadata.cardinality.value)) {
      // We're already at infinite, so ignore any later metadata
      cardinality.type = 'estimate';
      cardinality.value = Number.POSITIVE_INFINITY;
    } else {
      if (action.appendingMetadata.cardinality.type === 'estimate') {
        cardinality.type = 'estimate';
      }
      cardinality.value += action.appendingMetadata.cardinality.value;
    }

    return { metadata: { cardinality }};
  }
}
