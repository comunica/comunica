import type {
  IActionRdfMetadataExtract,
  IActorRdfMetadataExtractArgs,
  IActorRdfMetadataExtractOutput,
} from '@comunica/bus-rdf-metadata-extract';
import { ActorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';

/**
 * A comunica Allow HTTP Methods RDF Metadata Extract Actor.
 */
export class ActorRdfMetadataExtractAllowHttpMethods extends ActorRdfMetadataExtract {
  public constructor(args: IActorRdfMetadataExtractArgs) {
    super(args);
  }

  public async test(_action: IActionRdfMetadataExtract): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionRdfMetadataExtract): Promise<IActorRdfMetadataExtractOutput> {
    const metadata: Record<string, any> = {};
    if (action.headers?.get('allow')) {
      metadata.allowHttpMethods = action.headers.get('allow')?.split(/, */u);
    }
    return { metadata };
  }
}
