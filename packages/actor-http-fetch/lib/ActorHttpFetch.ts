import type { IActionHttp, IActorHttpOutput, IActorHttpArgs } from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import type { ActorHttpInvalidateListenable } from '@comunica/bus-http-invalidate';
import { KeysHttp, KeysInitQuery } from '@comunica/context-entries';
import type { TestResult } from '@comunica/core';
import { passTest } from '@comunica/core';
import type { IMediatorTypeTime } from '@comunica/mediatortype-time';

// eslint-disable-next-line ts/no-require-imports
import CachePolicy = require('http-cache-semantics');

// eslint-disable-next-line import/extensions
import { version as actorVersion } from '../package.json';

import { CachePolicyHttpCacheSemanticsWrapper } from './CachePolicyHttpCacheSemanticsWrapper';
import { FetchInitPreprocessor } from './FetchInitPreprocessor';
import type { IFetchInitPreprocessor } from './IFetchInitPreprocessor';

export class ActorHttpFetch extends ActorHttp {
  private readonly fetchInitPreprocessor: IFetchInitPreprocessor;

  private static readonly userAgent = ActorHttp.createUserAgent('ActorHttpFetch', actorVersion);

  public constructor(args: IActorHttpFetchArgs) {
    super(args);
    this.fetchInitPreprocessor = new FetchInitPreprocessor(args);
  }

  public async test(_action: IActionHttp): Promise<TestResult<IMediatorTypeTime>> {
    return passTest({ time: Number.POSITIVE_INFINITY });
  }

  public async run(action: IActionHttp): Promise<IActorHttpOutput> {
    const headers = this.prepareRequestHeaders(action);

    const init: RequestInit = { method: 'GET', ...action.init, headers };

    this.logInfo(action.context, `Requesting ${ActorHttp.getInputUrl(action.input).href}`, () => ({
      headers: ActorHttp.headersToHash(headers),
      method: init.method,
    }));

    // TODO: remove this workaround once this has a fix: https://github.com/inrupt/solid-client-authn-js/issues/1708
    if (action.context.has(KeysHttp.fetch)) {
      init.headers = ActorHttp.headersToHash(headers);
    }

    if (action.context.get(KeysHttp.includeCredentials)) {
      init.credentials = 'include';
    }

    const httpTimeout = action.context.get(KeysHttp.httpTimeout);
    const httpBodyTimeout = action.context.get(KeysHttp.httpBodyTimeout);
    const fetchFunction = action.context.get(KeysHttp.fetch) ?? fetch;
    const requestInit = await this.fetchInitPreprocessor.handle(init, action.context);

    let timeoutCallback: () => void;
    let timeoutHandle: NodeJS.Timeout | undefined;

    const abortSignal = action.context.get(KeysHttp.httpAbortSignal);
    if (abortSignal) {
      requestInit.signal = AbortSignal
        .any([ ...requestInit.signal ? [ requestInit.signal ] : [], abortSignal ]);
    }

    if (httpTimeout) {
      const abortController = new AbortController();
      requestInit.signal = AbortSignal
        .any([ ...requestInit.signal ? [ requestInit.signal ] : [], abortController.signal ]);
      timeoutCallback = () => abortController.abort(new Error(`Fetch timed out for ${ActorHttp.getInputUrl(action.input).href} after ${httpTimeout} ms`));
      timeoutHandle = setTimeout(() => timeoutCallback(), httpTimeout);
    }

    const response: IActorHttpOutput = await fetchFunction(action.input, requestInit);

    response.fromCache = response.headers.get('x-comunica-cache') === 'HIT';
    if (response.fromCache) {
      this.logInfo(action.context, `Cache hit for ${ActorHttp.getInputUrl(action.input).href}`);
    }

    response.cachePolicy = new CachePolicyHttpCacheSemanticsWrapper(new CachePolicy(
      await CachePolicyHttpCacheSemanticsWrapper.convertFromFetchRequest(action, this.fetchInitPreprocessor),
      {
        status: response.status,
        headers: ActorHttp.headersToHash(response.headers),
      },
      {
        // Disabled "shared" ensures responses with set-cookie are also cached.
        // For example, for https://www.w3.org/ns/activitystreams
        shared: false,
      },
    ), action.context.get(KeysInitQuery.queryTimestampHighResolution), this.fetchInitPreprocessor);

    if (httpTimeout && (!httpBodyTimeout || !response.body)) {
      clearTimeout(timeoutHandle);
    }

    return response;
  }

  /**
   * Prepares the request headers, taking into account the environment.
   * @param {IActionHttp} action The HTTP action
   * @returns {Headers} Headers
   */
  public prepareRequestHeaders(action: IActionHttp): Headers {
    const headers = new Headers(action.init?.headers);

    if (ActorHttp.isBrowser()) {
      // When running in a browser, the User-Agent header should never be set
      headers.delete('user-agent');
    } else if (!headers.has('user-agent')) {
      // Otherwise, if no header value is provided, use the actor one
      headers.set('user-agent', ActorHttpFetch.userAgent!);
    }

    const authString = action.context.get(KeysHttp.auth);
    if (authString) {
      headers.set('Authorization', `Basic ${ActorHttpFetch.stringToBase64(authString)}`);
    }

    return headers;
  }

  /**
   * Converts a string, including ones with Unicode symbols, to Base64 encoding.
   * This function was adapted from the MDN example function here:
   * https://developer.mozilla.org/en-US/docs/Glossary/Base64#the_unicode_problem
   * @param {string} value The string value to encode
   * @returns {string} The Base64-encoded value
   */
  public static stringToBase64(value: string): string {
    const bytes = new TextEncoder().encode(value);
    const binString = Array.from(bytes, byte => String.fromCodePoint(byte)).join('');
    return btoa(binString);
  }
}

export interface IActorHttpFetchArgs extends IActorHttpArgs {
  /**
   * Maximum size of the cache (in bytes).
   * Defaults to 100MB.
   * @range {integer}
   * @default {104857600}
   */
  cacheMaxSize: number;
  /**
   * Maximum number of documents to store in the cache.
   * @range {integer}
   * @default {1000}
   */
  cacheMaxCount: number;
  /**
   * Maximum size of an entry in the cache (in bytes).
   * Defaults to 5MB.
   * @range {integer}
   * @default {5242880}
   */
  cacheMaxEntrySize: number;
  /* eslint-disable max-len */
  /**
   * An actor that listens to HTTP invalidation events
   * @default {<default_invalidator> a <npmd:@comunica/bus-http-invalidate/^5.0.0/components/ActorHttpInvalidateListenable.jsonld#ActorHttpInvalidateListenable>}
   */
  httpInvalidator: ActorHttpInvalidateListenable;
  /* eslint-enable max-len */
  /**
   * The agent options for the HTTP agent
   * @range {json}
   * @default {{ "keepAlive": true, "maxSockets": 5 }}
   */
  agentOptions?: Record<string, any>;
}
