import { ActorRdfDereferenceHttpBase } from './ActorRdfDereferenceHttpBase';

/**
 * The non-browser variant of {@link ActorRdfDereferenceHttp}.
 */
export class ActorRdfDereferenceHttp extends ActorRdfDereferenceHttpBase {
  protected getMaxAcceptHeaderLength(): number {
    return this.maxAcceptHeaderLength;
  }
}
