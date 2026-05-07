import { ActorDereferenceHttpBase } from './ActorDereferenceHttpBase';

/**
 * The browser variant of {@link ActorDereferenceHttp}.
 */
export class ActorDereferenceHttp extends ActorDereferenceHttpBase {
  /**
   * Returns the maximum Accept header length for browser environments.
   * @return The configured maximum Accept header length for browsers.
   */
  protected getMaxAcceptHeaderLength(): number {
    return this.maxAcceptHeaderLengthBrowser;
  }
}
