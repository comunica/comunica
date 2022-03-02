import type {
  IActionRdfMetadataExtract,
  IActorRdfMetadataExtractArgs,
  IActorRdfMetadataExtractOutput,
} from '@comunica/bus-rdf-metadata-extract';
import { ActorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import type { IActorTest } from '@comunica/core';

/**
 * A comunica Allow HTTP Methods RDF Metadata Extract Actor.
 */
export class ActorRdfMetadataExtractAllowHttpMethods extends ActorRdfMetadataExtract {
  public constructor(args: IActorRdfMetadataExtractArgs) {
    super(args);
  }

  public async test(action: IActionRdfMetadataExtract): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionRdfMetadataExtract): Promise<IActorRdfMetadataExtractOutput> {
    const metadata: Record<string, any> = {};
    if (action.headers?.get('allow')) {
      metadata.allowHttpMethods = action.headers.get('allow')?.split(/, */u);
    }
    return { metadata };
  }
}
