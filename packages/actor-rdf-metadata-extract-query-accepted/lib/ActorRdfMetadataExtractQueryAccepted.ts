import type {
  IActionRdfMetadataExtract,
  IActorRdfMetadataExtractOutput,
  IActorRdfMetadataExtractArgs,
} from '@comunica/bus-rdf-metadata-extract';
import { ActorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import type { TestResult, IActorTest } from '@comunica/core';
import { passTestVoid } from '@comunica/core';

/**
 * A comunica Query Accepted RDF Metadata Extract Actor.
 *
 * Extracts the `Accept-Query` header, with which servers advertise support for the HTTP QUERY method (RFC 10008),
 * together with the query formats they accept.
 */
export class ActorRdfMetadataExtractQueryAccepted extends ActorRdfMetadataExtract {
  public constructor(args: IActorRdfMetadataExtractArgs) {
    super(args);
  }

  public async test(_action: IActionRdfMetadataExtract): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionRdfMetadataExtract): Promise<IActorRdfMetadataExtractOutput> {
    const metadata: IActorRdfMetadataExtractOutput['metadata'] = {};
    const acceptQueryHeader = action.headers?.get('accept-query');
    if (acceptQueryHeader) {
      // Media types may carry parameters and weights, which we strip so that consumers can match on the type itself.
      const queryAccepted = acceptQueryHeader
        .split(',')
        .map(mediaType => mediaType.split(';')[0].trim().toLowerCase())
        .filter(mediaType => mediaType.length > 0);
      if (queryAccepted.length > 0) {
        metadata.queryAccepted = queryAccepted;
      }
    }
    return { metadata };
  }
}
