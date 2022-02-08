/* eslint-disable unicorn/filename-case */
/* eslint-enable unicorn/filename-case */
import {
  ActorDereferenceHttpBase,
} from './ActorDereferenceHttpBase';

/**
 * The browser variant of {@link ActorDereferenceHttp}.
 */
export class ActorDereferenceHttp extends ActorDereferenceHttpBase {
  protected getMaxAcceptHeaderLength(): number {
    return this.maxAcceptHeaderLengthBrowser;
  }
}
