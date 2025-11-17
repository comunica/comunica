/* eslint-disable import/no-nodejs-modules */
import { Agent as HttpAgent } from 'node:http';
import { Agent as HttpsAgent } from 'node:https';
import type { IActionHttpInvalidate } from '@comunica/bus-http-invalidate';
import { KeysHttp } from '@comunica/context-entries';
import type { IActionContext } from '@comunica/types';
import type { Dispatcher } from 'undici';
import { Agent, interceptors } from 'undici';

/* eslint-enable import/no-nodejs-modules */
import CacheHandler from 'undici/types/cache-interceptor';
import type { IActorHttpFetchArgs } from './ActorHttpFetch';
import type { IFetchInitPreprocessor } from './IFetchInitPreprocessor';
import { MetadataWrappingCacheStore } from './MetadataWrappingCacheStore';
import CacheStore = CacheHandler.CacheStore;

// eslint-disable-next-line ts/no-require-imports,ts/no-var-requires
const cacheStores = require('undici').cacheStores;
// TODO: the require above can be replaced with import when undici updates.

/**
 * Overrides the HTTP agent to perform better in Node.js.
 */
export class FetchInitPreprocessor implements IFetchInitPreprocessor {
  private readonly agent: (url: URL) => HttpAgent;
  private dispatcher!: Dispatcher;
  private cache!: CacheStore;

  public constructor(args: IActorHttpFetchArgs) {
    const httpAgent = new HttpAgent(args.agentOptions);
    const httpsAgent = new HttpsAgent(args.agentOptions);
    this.agent = (_parsedURL: URL): HttpAgent => _parsedURL.protocol === 'http:' ? httpAgent : httpsAgent;
    this.createCache(args);
    args.httpInvalidator.addInvalidateListener(
      ({ url }: IActionHttpInvalidate) => {
        if (url) {
          const parsedUrl = new URL(url);
          // eslint-disable-next-line ts/no-floating-promises
          this.cache.delete({ origin: parsedUrl.origin, path: parsedUrl.pathname + parsedUrl.search, method: 'GET' });
        } else {
          this.createCache(args);
        }
      },
    );
  }

  protected createCache(args: IActorHttpFetchArgs): void {
    this.cache = new cacheStores.MemoryCacheStore({
      maxSize: args.cacheMaxSize,
      maxCount: args.cacheMaxCount,
      maxEntrySize: args.cacheMaxEntrySize,
    });
    this.dispatcher = new Agent().compose(interceptors.cache({
      store: new MetadataWrappingCacheStore(this.cache),
      methods: [ 'GET', 'HEAD' ],
    }));
  }

  public async handle(
    init: RequestInit,
    context: IActionContext,
  ): Promise<RequestInit & { agent: (url: URL) => HttpAgent; dispatcher?: Dispatcher }> {
    // Add 'Accept-Encoding' headers
    const headers = new Headers(init.headers);
    if (!headers.has('Accept-Encoding')) {
      headers.set('Accept-Encoding', 'br,gzip,deflate');
      init = { ...init, headers };
    }

    // The Fetch API requires specific options to be set when sending body streams:
    // - 'keepalive' can not be true
    // - 'duplex' must be set to 'half'
    return {
      ...init,
      ...init.body ? { keepalive: false, duplex: 'half' } : { keepalive: true },
      agent: this.agent,
      dispatcher: context.get(KeysHttp.httpCache) ? this.dispatcher : undefined,
    };
  }
}
