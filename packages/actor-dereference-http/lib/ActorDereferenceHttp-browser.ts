import type { IActorDereferenceHttpArgs } from './ActorDereferenceHttpBase';
import {
  ActorDereferenceHttpBase,
} from './ActorDereferenceHttpBase';

/**
 * The browser variant of {@link ActorDereferenceHttp}.
 */
export class ActorDereferenceHttp extends ActorDereferenceHttpBase {
  public constructor(args: IActorDereferenceHttpArgs) {
    super(args);
  }

  protected getMaxAcceptHeaderLength(): number {
    return this.maxAcceptHeaderLengthBrowser;
  }
}
