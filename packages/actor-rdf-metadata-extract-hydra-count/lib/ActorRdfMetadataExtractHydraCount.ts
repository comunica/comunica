import {ActorRdfMetadataExtract, IActionRdfMetadataExtract,
  IActorRdfMetadataExtractOutput} from "@comunica/bus-rdf-metadata-extract";
import {IActorArgs, IActorTest} from "@comunica/core";
import * as RDF from "rdf-js";

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
      const dataListener = (quad: RDF.Quad) => {
        if (this.predicates.indexOf(quad.predicate.value) >= 0) {
          action.metadata.removeListener('data', dataListener);
          resolve({ metadata: { totalItems: parseInt(quad.object.value, 10) }});
        }
      };
      action.metadata.on('data', dataListener);

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
