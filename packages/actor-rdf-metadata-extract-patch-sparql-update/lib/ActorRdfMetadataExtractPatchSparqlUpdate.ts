import type { IActionRdfMetadataExtract, IActorRdfMetadataExtractOutput,
  IActorRdfMetadataExtractArgs } from '@comunica/bus-rdf-metadata-extract';
import { ActorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import type { IActorTest } from '@comunica/core';

/**
 * A comunica Patch SPARQL Update RDF Metadata Extract Actor.
 */
export class ActorRdfMetadataExtractPatchSparqlUpdate extends ActorRdfMetadataExtract {
  public constructor(args: IActorRdfMetadataExtractArgs) {
    super(args);
  }

  public async test(action: IActionRdfMetadataExtract): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionRdfMetadataExtract): Promise<IActorRdfMetadataExtractOutput> {
    const metadata: any = {};
    // The ms-author-via header is added for backwards-compatibility with old Solid servers
    if (action.headers &&
      ((action.headers['accept-patch'] && action.headers['accept-patch'].includes('application/sparql-update')) ||
      (action.headers['ms-author-via'] && action.headers['ms-author-via'].includes('SPARQL')))) {
      metadata.patchSparqlUpdate = true;
    }
    return { metadata };
  }
}
