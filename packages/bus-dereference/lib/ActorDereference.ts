import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';

import type { ICacheResponseHead } from '@comunica/types';
import type CachePolicy = require('http-cache-semantics');
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
  cachePolicy?: IDereferenceCachePolicy;
}

export type IActorDereferenceArgs = IActorArgs<IActionDereference, IActorTest, IActorDereferenceOutput>;

export type MediatorDereference = Mediate<IActionDereference, IActorDereferenceOutput>;

export interface IDereferenceCachePolicy {
  /**
   * Returns true if the response can be stored in a cache.
   * If it's false then you MUST NOT store either the request or the response.
   */
  storable: () => boolean;

  /**
   * This is the most important method. Use this method to check whether a cached response is still fresh in the
   * context of the new request.
   *
   * If it returns true, then the given request matches the original response this cache policy has been created with,
   * and the response can be reused without contacting the server. Note that the old response can't be returned without
   * being updated, see responseHeaders().
   *
   * If it returns false, then the response may not be matching at all (e.g. it's for a different URL or method),
   * or may require to be refreshed first (see revalidationHeaders()).
   *
   * @param action The new dereference action.
   */
  satisfiesWithoutRevalidation: (action: IActionDereference) => Promise<boolean>;

  /**
   * Returns updated, filtered set of response headers to return to clients receiving the cached response.
   * This function is necessary, because proxies MUST always remove hop-by-hop headers (such as TE and Connection) and
   * update response's Age to avoid doubling cache time.
   * Example:
   * `cachedResponse.headers = cachePolicy.responseHeaders(cachedResponse);`
   */
  responseHeaders: () => Headers;

  /**
   * Returns approximate time in milliseconds until the response becomes stale (i.e. not fresh).
   *
   * After that time (when `timeToLive() <= 0`) the response might not be usable without revalidation. However,
   * there are exceptions, e.g. a client can explicitly allow stale responses, so always check with
   * `satisfiesWithoutRevalidation()`.
   */
  timeToLive: () => number;

  /**
   * Returns updated, filtered set of request headers to send to the origin server to check if the cached
   * response can be reused. These headers allow the origin server to return status 304 indicating the
   * response is still fresh. All headers unrelated to caching are passed through as-is.
   *
   * Use this method when updating cache from the origin server.
   *
   * @example
   * updateRequest.headers = cachePolicy.revalidationHeaders(updateRequest);
   */
  revalidationHeaders: (newAction: IActionDereference) => Promise<Headers>;

  /**
   * Use this method to update the cache after receiving a new response from the origin server.
   */
  revalidatedPolicy: (
    revalidationAction: IActionDereference,
    revalidationResponse: ICacheResponseHead,
  ) => Promise<IDereferenceRevalidationPolicy>;
}

export interface IDereferenceRevalidationPolicy {
  /**
   * A new `IDereferenceCachePolicy` with HTTP headers updated from `revalidationResponse`. You can always replace
   * the old cached `IDereferenceCachePolicy` with the new one.
   */
  policy: IDereferenceCachePolicy;
  /**
   * Boolean indicating whether the response body has changed.
   *
   * - If `false`, then a valid 304 Not Modified response has been received, and you can reuse the old
   * cached response body.
   * - If `true`, you should use new response's body (if present), or make another request to the origin
   * server without any conditional headers (i.e. don't use `revalidationHeaders()` this time) to get
   * the new resource.
   */
  modified: boolean;
  matches: boolean;
}
