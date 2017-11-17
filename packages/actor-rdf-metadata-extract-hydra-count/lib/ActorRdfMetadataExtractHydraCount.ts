import {ActorRdfMetadataExtract, IActionRdfMetadataExtract,
  IActorRdfMetadataExtractOutput} from "@comunica/bus-rdf-metadata-extract";
import {IActorArgs, IActorTest} from "@comunica/core";

/**
 * An RDF Metadata Extract Actor that extracts total items counts from a metadata stream based on the given predicates.
 */
export class ActorRdfMetadataExtractHydraCount extends ActorRdfMetadataExtract
  implements IActorRdfParseFixedMediaTypesArgs {

  public readonly predicates: string[];

  constructor(args: IActorRdfParseFixedMediaTypesArgs) {
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
      action.metadata.on('data', (quad) => {
        if (this.predicates.indexOf(quad.predicate.value) >= 0) {
          resolve({ metadata: { totalItems: parseInt(quad.object.value, 10) }});
        }
      });

      // If no value has been found, assume infinity.
      action.metadata.on('end', () => {
        resolve({ metadata: { totalItems: Infinity } });
      });
    });
  }

}

export interface IActorRdfParseFixedMediaTypesArgs
  extends IActorArgs<IActionRdfMetadataExtract, IActorTest, IActorRdfMetadataExtractOutput> {
  predicates: string[];
}
