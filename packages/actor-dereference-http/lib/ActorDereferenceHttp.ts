import { ActorDereferenceHttpBase } from './ActorDereferenceHttpBase.js';

/**
 * The non-browser variant of {@link ActorDereferenceHttp}.
 */
export class ActorDereferenceHttp extends ActorDereferenceHttpBase {
  protected getMaxAcceptHeaderLength(): number {
    return this.maxAcceptHeaderLength;
  }
}
