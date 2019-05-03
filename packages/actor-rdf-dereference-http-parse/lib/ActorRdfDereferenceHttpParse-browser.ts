import {ActorRdfDereferenceHttpParseBase, IActorRdfDereferenceHttpParseArgs} from "./ActorRdfDereferenceHttpParseBase";

/**
 * The browser variant of {@link ActorRdfDereferenceHttpParse}.
 */
export class ActorRdfDereferenceHttpParse extends ActorRdfDereferenceHttpParseBase {

  constructor(args: IActorRdfDereferenceHttpParseArgs) {
    super(args);
  }

  protected getMaxAcceptHeaderLength(): number {
    return this.maxAcceptHeaderLengthBrowser;
  }

}
