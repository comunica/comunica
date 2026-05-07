import { ActorDereferenceHttpBase } from './ActorDereferenceHttpBase';

/**
 * The non-browser variant of {@link ActorDereferenceHttp}.
 */
export class ActorDereferenceHttp extends ActorDereferenceHttpBase {
  /**
   * Returns the maximum Accept header length for non-browser environments.
   * @return The configured maximum Accept header length.
   */
  protected getMaxAcceptHeaderLength(): number {
    return this.maxAcceptHeaderLength;
  }
}
