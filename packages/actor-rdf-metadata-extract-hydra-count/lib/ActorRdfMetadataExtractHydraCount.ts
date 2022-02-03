import type { IActionRdfMetadataExtract,
  IActorRdfMetadataExtractOutput, IActorRdfMetadataExtractArgs } from '@comunica/bus-rdf-metadata-extract';
import { ActorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import type { IActorTest } from '@comunica/core';

/**
 * An RDF Metadata Extract Actor that extracts total items counts from a metadata stream based on the given predicates.
 */
export class ActorRdfMetadataExtractHydraCount extends ActorRdfMetadataExtract
  implements IActorRdfParseFixedMediaTypesArgs {
  public readonly predicates: string[];

  public constructor(args: IActorRdfParseFixedMediaTypesArgs) {
    super(args);
  }

  public async test(action: IActionRdfMetadataExtract): Promise<IActorTest> {
    return true;
  }

  public run(action: IActionRdfMetadataExtract): Promise<IActorRdfMetadataExtractOutput> {
    return new Promise((resolve, reject) => {
      // Forward errors
      action.metadata.on('error', reject);

      // Immediately resolve when a value has been found.
      action.metadata.on('data', quad => {
        if (this.predicates.includes(quad.predicate.value)) {
          resolve({ metadata: { cardinality: { type: 'estimate', value: Number.parseInt(quad.object.value, 10) }}});
        }
      });

      // If no value has been found, assume infinity.
      action.metadata.on('end', () => {
        resolve({ metadata: { cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }}});
      });
    });
  }
}

export interface IActorRdfParseFixedMediaTypesArgs extends IActorRdfMetadataExtractArgs {
  /**
   * A predicate that provides a count estimate
   * @default {http://www.w3.org/ns/hydra/core#totalItems}
   * @default {http://rdfs.org/ns/void#triples}
   */
  predicates: string[];
}
