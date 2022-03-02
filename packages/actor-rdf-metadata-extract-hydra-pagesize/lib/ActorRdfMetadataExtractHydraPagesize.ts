import type { IActionRdfMetadataExtract, IActorRdfMetadataExtractOutput,
  IActorRdfMetadataExtractArgs } from '@comunica/bus-rdf-metadata-extract';
import { ActorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import type { IActorTest } from '@comunica/core';

/**
 * A comunica Hydra Pagesize RDF Metadata Extract Actor.
 */
export class ActorRdfMetadataExtractHydraPagesize extends ActorRdfMetadataExtract {
  public readonly predicates: string[];

  public constructor(args: IActorRdfMetadataExtractHydraPagesizeArgs) {
    super(args);
  }

  public async test(action: IActionRdfMetadataExtract): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionRdfMetadataExtract): Promise<IActorRdfMetadataExtractOutput> {
    return new Promise((resolve, reject) => {
      // Forward errors
      action.metadata.on('error', reject);

      // Immediately resolve when a value has been found.
      action.metadata.on('data', quad => {
        if (this.predicates.includes(quad.predicate.value)) {
          resolve({ metadata: { pageSize: Number.parseInt(quad.object.value, 10) }});
        }
      });

      // If no value has been found, don't define the pageSize value.
      action.metadata.on('end', () => {
        resolve({ metadata: {}});
      });
    });
  }
}

export interface IActorRdfMetadataExtractHydraPagesizeArgs extends IActorRdfMetadataExtractArgs {
  /**
   * A predicate that provides the page size
   * @default {http://www.w3.org/ns/hydra/core#itemsPerPage}
   */
  predicates: string[];
}
