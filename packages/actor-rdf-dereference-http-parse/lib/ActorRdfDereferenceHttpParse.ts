import {ActorRdfDereferenceHttpParseBase} from "./ActorRdfDereferenceHttpParseBase";

/**
 * The non-browser variant of {@link ActorRdfDereferenceHttpParse}.
 */
export class ActorRdfDereferenceHttpParse extends ActorRdfDereferenceHttpParseBase {

  protected getMaxAcceptHeaderLength(): number {
    return this.maxAcceptHeaderLength;
  }

}
