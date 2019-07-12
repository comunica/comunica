import {ActorRdfMetadataQuadPredicate, IActionRdfMetadata, IActorRdfMetadataOutput} from "@comunica/bus-rdf-metadata";
import {IActorArgs, IActorTest} from "@comunica/core";
import * as RDF from "rdf-js";

/**
 * An RDF Metadata Actor that splits off the metadata based on the existence of a preconfigured set of predicates
 * with the page url as subject.
 */
export class ActorRdfMetadataTriplePredicate extends ActorRdfMetadataQuadPredicate
  implements IActorRdfParseFixedMediaTypesArgs {

  public readonly predicateRegexes: string[];

  constructor(args: IActorRdfParseFixedMediaTypesArgs) {
    super(args);
  }

  public async test(action: IActionRdfMetadata): Promise<IActorTest> {
    return true;
  }

  public isMetadata(quad: RDF.Quad, url: string, context: any): boolean {
    if (quad.subject.value === url) {
      return true;
    }
    for (const regex of this.predicateRegexes) {
      if (quad.predicate.value.match(regex)) {
        return true;
      }
    }
    return false;
  }

}

export interface IActorRdfParseFixedMediaTypesArgs
  extends IActorArgs<IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput> {
  predicateRegexes: string[];
}
