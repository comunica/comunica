import type {
  IActionRdfMetadataAccumulate,
  IActorRdfMetadataAccumulateOutput,
  IActorRdfMetadataAccumulateArgs,
} from '@comunica/bus-rdf-metadata-accumulate';
import { ActorRdfMetadataAccumulate } from '@comunica/bus-rdf-metadata-accumulate';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { QueryResultCardinality } from '@comunica/types';

/**
 * A comunica Cardinality RDF Metadata Accumulate Actor.
 */
export class ActorRdfMetadataAccumulateCardinality extends ActorRdfMetadataAccumulate {
  public constructor(args: IActorRdfMetadataAccumulateArgs) {
    super(args);
  }

  public async test(_action: IActionRdfMetadataAccumulate): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionRdfMetadataAccumulate): Promise<IActorRdfMetadataAccumulateOutput> {
    // Return default value on initialize
    if (action.mode === 'initialize') {
      return { metadata: { cardinality: { type: 'exact', value: 0 }}};
    }

    // Otherwise, attempt to update existing value
    const cardinality: QueryResultCardinality = { ...action.accumulatedMetadata.cardinality };

    if (cardinality.dataset) {
      // If the accumulated cardinality refers to that of the full default graph (applicable for SPARQL endpoints)
      if (action.accumulatedMetadata.defaultGraph === cardinality.dataset &&
        cardinality.dataset !== action.appendingMetadata.cardinality.dataset) {
        // Use the cardinality of the appending metadata.
        return { metadata: { cardinality: action.appendingMetadata.cardinality }};
      }

      if (action.appendingMetadata.cardinality.dataset) {
        // If the accumulated cardinality is dataset-wide
        if (cardinality.dataset !== action.appendingMetadata.cardinality.dataset &&
          action.appendingMetadata.subsetOf === cardinality.dataset) {
          // If the appending cardinality refers to the subset of a dataset,
          // use the cardinality of the subset.
          return { metadata: { cardinality: action.appendingMetadata.cardinality }};
        }
        if (cardinality.dataset === action.appendingMetadata.cardinality.dataset) {
          // If the appending cardinality is for the same dataset,
          // keep the accumulated cardinality unchanged.
          return { metadata: { cardinality }};
        }
        // If the appending cardinality refers to another dataset,
        // remove the dataset scopes.
        delete cardinality.dataset;
      } else {
        // If the appending cardinality refers to a dataset subset,
        // keep the accumulated cardinality unchanged.
        return { metadata: { cardinality }};
      }
    }

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
