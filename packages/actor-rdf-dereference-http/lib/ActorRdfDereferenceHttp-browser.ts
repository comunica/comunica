/* eslint-disable unicorn/filename-case */
/* eslint-enable unicorn/filename-case */
import type { IActorRdfDereferenceHttpArgs } from './ActorRdfDereferenceHttpBase';
import {
  ActorRdfDereferenceHttpBase,
} from './ActorRdfDereferenceHttpBase';

/**
 * The browser variant of {@link ActorRdfDereferenceHttp}.
 */
export class ActorRdfDereferenceHttp extends ActorRdfDereferenceHttpBase {
  public constructor(args: IActorRdfDereferenceHttpArgs) {
    super(args);
  }

  protected getMaxAcceptHeaderLength(): number {
    return this.maxAcceptHeaderLengthBrowser;
  }
}
