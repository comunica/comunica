import type { IActionRdfMetadataExtract, IActorRdfMetadataExtractOutput } from '@comunica/bus-rdf-metadata-extract';
import { ActorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import type { IActorArgs, IActorTest } from '@comunica/core';

/**
 * A comunica PUT Accepted RDF Metadata Extract Actor.
 */
export class ActorRdfMetadataExtractPutAccepted extends ActorRdfMetadataExtract {
  public constructor(args: IActorArgs<IActionRdfMetadataExtract, IActorTest, IActorRdfMetadataExtractOutput>) {
    super(args);
  }

  public async test(action: IActionRdfMetadataExtract): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionRdfMetadataExtract): Promise<IActorRdfMetadataExtractOutput> {
    const metadata: any = {};
    if (action.headers && action.headers['accept-put']) {
      metadata.putAccepted = action.headers['accept-put'].split(/, */u);
    }
    return { metadata };
  }
}
