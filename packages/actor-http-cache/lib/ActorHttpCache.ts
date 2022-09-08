/* eslint import/no-nodejs-modules: ["error", {"allow": ["stream"]}] */
import { Readable } from 'stream';
import type {
  IActionHttp,
  IActorHttpOutput,
  IActorHttpArgs,
  MediatorHttp,
} from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import type {
  ActorHttpInvalidateListenable,
  IActionHttpInvalidate,
  MediatorHttpInvalidate,
} from '@comunica/bus-http-invalidate';
import { KeysHttpCache } from '@comunica/context-entries';
import type { IHttpCacheStorage } from '@comunica/http-cache-storage';
import type { IMediatorTypeTime } from '@comunica/mediatortype-time';
import 'cross-fetch/polyfill';
import * as CachePolicy from 'http-cache-semantics';
import {
  requestToRequestWithHashHeaders,
  responseToResponseWithHashHeaders,
  addHashHeadersToObject,
} from './headerConversionHelpers';

/**
 * A comunica Cache Http Actor.
 */
export class ActorHttpCache extends ActorHttp {
  private readonly cacheStorage: IHttpCacheStorage;
  private readonly mediatorHttpInvalidate: MediatorHttpInvalidate;
  private readonly mediatorHttp: MediatorHttp;

  public constructor(args: IActorHttpCacheArgs) {
    super(args);
    this.cacheStorage = args.cacheStorage;
    this.mediatorHttpInvalidate = args.mediatorHttpInvalidate;
    this.mediatorHttp = args.mediatorHttp;
    args.httpInvalidator.addInvalidateListener(
      ({ url }: IActionHttpInvalidate) =>
        url ?
          this.cacheStorage.delete(new Request(url)) :
          this.cacheStorage.clear(),
    );
  }

  public async test(action: IActionHttp): Promise<IMediatorTypeTime> {
    if (await this.has(new Request(action.input, action.init))) {
      return { time: 1 };
    }
    if (action.context.get(KeysHttpCache.doNotCheckHttpCache)) {
      throw new Error(`Actor ${this.name} skipped as cache should not be checked.`);
    }
    const newAction = {
      ...action,
      context: action.context.set(KeysHttpCache.doNotCheckHttpCache, true),
    };
    return await (await this.mediatorHttp.mediateActor(newAction)).test(newAction);
  }

  public async run(action: IActionHttp): Promise<IActorHttpOutput> {
    // Fetch data
    return await this.fetchWithCache(action);
  }

  /**
   * Fetches a request from the cache or from the web if it is not present in
   * the cache.
   * @param request The Request for which you are attempting to find responses
   * in the Cache. This can be a Request object or a URL.
   * @param options An object that sets options for the match operation.
   * @returns A Promise that resolves to the first Response that matches the
   * request and a boolean indicating if the value was from the cache or not
   */
  public async fetchWithCache(
    action: IActionHttp,
  ): Promise<Response> {
    const newRequest = new Request(action.input, action.init);
    const cacheResult = await this.cacheStorage.get(newRequest);
    // Nothing is in the cache
    if (!cacheResult) {
      const [ body, init ] = await this.fetchDocument(action);
      try {
        await this.put(newRequest, body, init);
      } catch {
        // Do nothing if it is not storable
      }
      return this.newResponse(body, init);
      // Something is in the cache
    }
    // Check if the response is stale
    const oldPolicy = cacheResult.policy;
    const oldResponse = this.newResponse(cacheResult.body, cacheResult.init);

    const newRequestWithHashHeaders = requestToRequestWithHashHeaders(
      new Request(newRequest),
    );
    // If the response is stale
    if (!oldPolicy.satisfiesWithoutRevalidation(newRequestWithHashHeaders)) {
      // Invaidate the cache if it must be refreshed
      await this.mediatorHttpInvalidate.mediate({ url: newRequest.url, context: action.context });
      addHashHeadersToObject(
        oldPolicy.revalidationHeaders(newRequestWithHashHeaders),
        newRequest,
      );
      // Fetch again with new headers
      const [ body, init ] = await this.fetchDocument(action);
      const newResponse = this.newResponse(body, init);
      const { policy, modified } = oldPolicy.revalidatedPolicy(
        requestToRequestWithHashHeaders(newRequest),
        responseToResponseWithHashHeaders(newResponse),
      );
      const response = modified ? newResponse : oldResponse;
      await this.cacheStorage.set(
        newRequest,
        { policy, body, init },
        policy.timeToLive(),
      );
      return response;
    }
    return oldResponse;
  }

  /**
   * Fetches the document and splits it into parts
   * @param action Fetch action
   * @returns
   */
  private async fetchDocument(action: IActionHttp): Promise<[bodyInit?: BodyInit, responseInit?: ResponseInit]> {
    const response = await this.mediatorHttp.mediate({
      ...action,
      context: action.context.set(KeysHttpCache.doNotCheckHttpCache, true),
    });
    return [
      await response.text(),
      {
        headers: response.headers,
        status: response.status,
        statusText: response.statusText,
      },
    ];
  }

  /**
   * The put() method of the Cache interface allows key/value pairs to be added
   * to the current Cache object.
   * @param request The Request object or URL that you want to add to the cache.
   * @param response The Response you want to match up to the request.
   */
  public async put(requestInfo: RequestInfo, body?: BodyInit, init?: ResponseInit): Promise<void> {
    const request = new Request(requestInfo);
    const response = new Response(body, init);
    // Headers need to be converted to a hash because http-cache-semantics was
    // built for an older version of headers.
    const requestWithHashHeaders = requestToRequestWithHashHeaders(request);
    const responseWithHashHeaders = responseToResponseWithHashHeaders(response);
    const policy = new CachePolicy(
      requestWithHashHeaders,
      responseWithHashHeaders,
    );
    if (!policy.storable()) {
      throw new TypeError(`${request.url} is not storable.`);
    }
    // Set the cache
    await this.cacheStorage.set(
      request,
      { policy, body, init },
      policy.timeToLive(),
    );
  }

  /**
   * Checks if there is a fresh response cached
   * @param requestInfo The request mapped to the response
   * @returns true if there is a fresh response cached
   */
  public async has(requestInfo: RequestInfo): Promise<boolean> {
    const request = new Request(requestInfo);
    const cacheResult = await this.cacheStorage.get(new Request(request));
    if (cacheResult) {
      const { policy } = cacheResult;
      return policy.satisfiesWithoutRevalidation(
        requestToRequestWithHashHeaders(request),
      );
    }
    return false;
  }

  /**
   * An alternative to `new Response()` that creates a response with a NodeJS stream
   * NodeJS streams are required for comunica's post processors.
   */
  private newResponse(body?: BodyInit, responseInit?: ResponseInit): Response {
    const nodeStream = new Readable();
    nodeStream.push(body);
    nodeStream.push(null);
    // @ts-expect-error The response must be a node-stream not a web stream for comunica's post processors
    const newResponse = new Response(nodeStream, responseInit);
    return newResponse;
  }
}

export interface IActorHttpCacheArgs extends IActorHttpArgs {
  /**
   * A storage object to be used by the cache
   */
  cacheStorage: IHttpCacheStorage;
  mediatorHttpInvalidate: MediatorHttpInvalidate;
  /* eslint-disable max-len */
  /**
   * An actor that listens to HTTP invalidation events
   * @default {<default_invalidator> a <npmd:@comunica/bus-http-invalidate/^2.0.0/components/ActorHttpInvalidateListenable.jsonld#ActorHttpInvalidateListenable>}
   */
  httpInvalidator: ActorHttpInvalidateListenable;
  /* eslint-enable max-len */
  mediatorHttp: MediatorHttp;
}
