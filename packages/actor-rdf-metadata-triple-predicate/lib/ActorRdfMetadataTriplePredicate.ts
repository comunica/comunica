import type { IActionRdfMetadata, IActorRdfMetadataOutput } from '@comunica/bus-rdf-metadata';
import { ActorRdfMetadataQuadPredicate } from '@comunica/bus-rdf-metadata';
import type { IActorArgs, IActorTest } from '@comunica/core';
import type * as RDF from 'rdf-js';

/**
 * An RDF Metadata Actor that splits off the metadata based on the existence of a preconfigured set of predicates
 * with the page url as subject.
 */
export class ActorRdfMetadataTriplePredicate extends ActorRdfMetadataQuadPredicate
  implements IActorRdfParseFixedMediaTypesArgs {
  public readonly predicateRegexes: string[];

  public constructor(args: IActorRdfParseFixedMediaTypesArgs) {
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
      // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec,unicorn/prefer-regexp-test
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
