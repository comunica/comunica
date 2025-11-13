import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { ICacheResponseHead, ILink, IQuerySource, MetadataBindings } from '@comunica/types';

/**
 * A comunica actor for query-source-dereference-link events.
 *
 * Actor types:
 * * Input:  IActionQuerySourceDereferenceLink:      The URL of a source to resolve.
 * * Test:   <none>
 * * Output: IActorQuerySourceDereferenceLinkOutput: A query source and metadata.
 *
 * @see IActionQuerySourceDereferenceLink
 * @see IActorQuerySourceDereferenceLinkOutput
 */
export abstract class ActorQuerySourceDereferenceLink<TS = undefined>
  extends Actor<IActionQuerySourceDereferenceLink, IActorTest, IActorQuerySourceDereferenceLinkOutput, TS> {
  /* eslint-disable max-len */
  /**
   * @param args -
   *   \ @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   *   \ @defaultNested {Query source dereference link failed: none of the configured actors were able to resolve ${action.link.url}} busFailMessage
   */
  /* eslint-enable max-len */
  public constructor(args: IActorQuerySourceDereferenceLinkArgs<TS>) {
    super(args);
  }
}

export interface IActionQuerySourceDereferenceLink extends IAction {
  /**
   * The link to dereference.
   */
  link: ILink;
  /**
   * A hash of all datasets that have been handled.
   */
  handledDatasets?: Record<string, boolean>;
}

export interface IActorQuerySourceDereferenceLinkOutput extends IActorOutput {
  /**
   * The new source of quads contained in the document.
   */
  source: IQuerySource;
  /**
   * Metadata about the source.
   */
  metadata: MetadataBindings;
  /**
   * The dataset that was handled.
   */
  dataset?: string;
  /**
   * The cache policy of the request's response.
   */
  cachePolicy?: IQuerySourceCachePolicy;
}

export type IActorQuerySourceDereferenceLinkArgs<TS = undefined> = IActorArgs<
IActionQuerySourceDereferenceLink,
  IActorTest,
IActorQuerySourceDereferenceLinkOutput,
TS
>;

export type MediatorQuerySourceDereferenceLink = Mediate<
IActionQuerySourceDereferenceLink,
  IActorQuerySourceDereferenceLinkOutput
>;

export interface IQuerySourceCachePolicy {
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
  satisfiesWithoutRevalidation: (action: IActionQuerySourceDereferenceLink) => Promise<boolean>;

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
  revalidationHeaders: (newAction: IActionQuerySourceDereferenceLink) => Promise<Headers>;

  /**
   * Use this method to update the cache after receiving a new response from the origin server.
   */
  revalidatedPolicy: (
    revalidationAction: IActionQuerySourceDereferenceLink,
    revalidationResponse: ICacheResponseHead,
  ) => Promise<IQuerySourceRevalidationPolicy>;
}

export interface IQuerySourceRevalidationPolicy {
  /**
   * A new `IQuerySourceCachePolicy` with HTTP headers updated from `revalidationResponse`. You can always replace
   * the old cached `IQuerySourceCachePolicy` with the new one.
   */
  policy: IQuerySourceCachePolicy;
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
