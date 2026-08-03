import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import type { ICachePolicy } from '@comunica/types';
import { ActorDereferenceBase } from './ActorDereferenceBase';

/**
 * A base actor for dereferencing URLs to (generic) streams.
 *
 * Actor types:
 * * Input:  IActionDereference:      A URL.
 * * Test:   <none>
 * * Output: IActorDereferenceOutput: A Readable stream
 *
 * @see IActionDereference
 * @see IActorDereferenceOutput
 */
export abstract class ActorDereference extends
  ActorDereferenceBase<IActionDereference, IActorTest, IActorDereferenceOutput> {
  /* eslint-disable max-len */
  /**
   * @param args -
   *   \ @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   *   \ @defaultNested {Dereferencing failed: none of the configured actors were able to handle ${action.url}} busFailMessage
   */
  /* eslint-enable max-len */
  public constructor(args: IActorDereferenceArgs) {
    super(args);
  }

  /**
   * Handle the given error as a rejection or delegate it to the logger,
   * depending on whether or not hard errors are enabled.
   * @param {IActionDereference} action A dereference action.
   * @param {Error} error An error that has occurred.
   * @param headers Optional HTTP headers to pass.
   * @param {number} requestTime The time it took to request the page in milliseconds.
   * @return {Promise<IActorDereferenceOutput>} A promise that rejects or resolves to an empty output.
   */
  protected async handleDereferenceErrors(
    action: IActionDereference,
    error: unknown,
    headers?: Headers | undefined,
    requestTime = 0,
  ): Promise<IActorDereferenceOutput> {
    return this.dereferenceErrorHandler(
      action,
      error,
      { url: action.url, exists: false, status: 404, headers, requestTime },
    );
  }
}

export interface IActionDereference extends IAction {
  /**
   * The URL to dereference
   */
  url: string;
  /**
   * By default, actors will reject upon receiving non-200 HTTP responses.
   * If this option is true, then all HTTP responses will cause the action to resolve,
   * but some outputs may therefore contain empty quad streams.
   */
  acceptErrors?: boolean;
  /**
   * Optional HTTP method to use.
   * Defaults to GET.
   */
  method?: string;
  /**
   * Optional HTTP headers to pass.
   */
  headers?: Headers;
  /**
   * An optional callback to retrieve the mediaType mappings
   */
  mediaTypes?: () => Promise<Record<string, number> | undefined>;
}

interface IReadableClose extends NodeJS.ReadableStream {
  close?: () => void | Promise<void>;
}

export interface IActorDereferenceOutput extends IActorOutput {
  /**
   * The page on which the output was found.
   *
   * This is not necessarily the same as the original input url,
   * as this may have changed due to redirects.
   */
  url: string;
  /**
   * BaseIRI, this is used over url when passed to metadata.baseIRI in ActorDereferenceRdfParse.ts
   */
  baseIRI?: string;
  /**
   * The resulting stream.
   */
  data: IReadableClose;
  /**
   * This will always be true, unless `acceptErrors` was set to true in the action and the dereferencing failed.
   */
  exists: boolean;
  /**
   * The time it took to request the page in milliseconds.
   * This is the time until the first byte arrives.
   */
  requestTime: number;
  /**
   * The HTTP status code.
   */
  status: number;
  /**
   * The returned headers of the final URL.
   */
  headers?: Headers;
  /**
   * The mediatype of the source
   */
  mediaType?: string;
  /**
   * The version that was defined as media type parameter.
   */
  version?: string;
  /**
   * The cache policy of the request's response.
   */
  cachePolicy?: ICachePolicy<IActionDereference>;
}

export type IActorDereferenceArgs = IActorArgs<IActionDereference, IActorTest, IActorDereferenceOutput>;

export type MediatorDereference = Mediate<IActionDereference, IActorDereferenceOutput>;
