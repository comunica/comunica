import type { IActionRdfMetadataExtract, IActorRdfMetadataExtractOutput,
  IActorRdfMetadataExtractArgs } from '@comunica/bus-rdf-metadata-extract';
import { ActorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import type { IActorTest } from '@comunica/core';

/**
 * A comunica PUT Accepted RDF Metadata Extract Actor.
 */
export class ActorRdfMetadataExtractPutAccepted extends ActorRdfMetadataExtract {
  public constructor(args: IActorRdfMetadataExtractArgs) {
    super(args);
  }

  public async test(action: IActionRdfMetadataExtract): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionRdfMetadataExtract): Promise<IActorRdfMetadataExtractOutput> {
    const metadata: IActorRdfMetadataExtractOutput['metadata'] = {};
    if (action.headers?.get('accept-put')) {
      metadata.putAccepted = action.headers.get('accept-put')?.split(/, */u);
    }
    return { metadata };
  }
}
