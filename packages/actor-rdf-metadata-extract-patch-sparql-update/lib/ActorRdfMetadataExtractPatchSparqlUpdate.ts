import type { IActionRdfMetadataExtract, IActorRdfMetadataExtractOutput } from '@comunica/bus-rdf-metadata-extract';
import { ActorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import type { IActorArgs, IActorTest } from '@comunica/core';

/**
 * A comunica Patch SPARQL Update RDF Metadata Extract Actor.
 */
export class ActorRdfMetadataExtractPatchSparqlUpdate extends ActorRdfMetadataExtract {
  public constructor(args: IActorArgs<IActionRdfMetadataExtract, IActorTest, IActorRdfMetadataExtractOutput>) {
    super(args);
  }

  public async test(action: IActionRdfMetadataExtract): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionRdfMetadataExtract): Promise<IActorRdfMetadataExtractOutput> {
    const metadata: any = {};
    if (action.headers && action.headers['accept-patch'] &&
      action.headers['accept-patch'].includes('application/sparql-update')) {
      metadata.patchSparqlUpdate = true;
    }
    return { metadata };
  }
}
