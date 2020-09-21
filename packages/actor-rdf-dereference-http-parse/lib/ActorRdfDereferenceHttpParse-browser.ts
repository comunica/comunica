/* eslint-disable unicorn/filename-case */
import type { IActorRdfDereferenceHttpParseArgs } from './ActorRdfDereferenceHttpParseBase';
import {
  ActorRdfDereferenceHttpParseBase,
} from './ActorRdfDereferenceHttpParseBase';

/**
 * The browser variant of {@link ActorRdfDereferenceHttpParse}.
 */
export class ActorRdfDereferenceHttpParse extends ActorRdfDereferenceHttpParseBase {
  public constructor(args: IActorRdfDereferenceHttpParseArgs) {
    super(args);
  }

  protected getMaxAcceptHeaderLength(): number {
    return this.maxAcceptHeaderLengthBrowser;
  }
}
