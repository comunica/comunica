/* eslint-disable import/no-nodejs-modules */
import { Agent as HttpAgent } from 'node:http';
import { Agent as HttpsAgent } from 'node:https';
import type { Dispatcher } from 'undici';
import { Agent, interceptors } from 'undici';

/* eslint-enable import/no-nodejs-modules */
import CacheHandler from 'undici/types/cache-interceptor';
import type { IFetchInitPreprocessor } from './IFetchInitPreprocessor';
import { MetadataWrappingCacheStore } from './MetadataWrappingCacheStore';
import CacheStore = CacheHandler.CacheStore;

// eslint-disable-next-line ts/no-require-imports,ts/no-var-requires
const cacheStores = require('undici').cacheStores; // TODO: can be replaced with import when undici updates.

/**
 * Overrides the HTTP agent to perform better in Node.js.
 */
export class FetchInitPreprocessor implements IFetchInitPreprocessor {
  private readonly agent: (url: URL) => HttpAgent;
  private readonly dispatcher: Dispatcher;
  private readonly cache: CacheStore;

  public constructor(agentOptions: any) {
    const httpAgent = new HttpAgent(agentOptions);
    const httpsAgent = new HttpsAgent(agentOptions);
    this.agent = (_parsedURL: URL): HttpAgent => _parsedURL.protocol === 'http:' ? httpAgent : httpsAgent;
    this.cache = new cacheStores.MemoryCacheStore({
      maxSize: 100 * 1024 * 1024, // TODO: actor params for now, but later variables to queryengine ctor
      maxCount: 1000,
      maxEntrySize: 5 * 1024 * 1024,
    });
    this.dispatcher = new Agent().compose(interceptors.cache({
      store: new MetadataWrappingCacheStore(this.cache),
      methods: [ 'GET', 'HEAD' ],
    }));
  }

  public async handle(
    init: RequestInit,
  ): Promise<RequestInit & { agent: (url: URL) => HttpAgent; dispatcher: Dispatcher }> {
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
      agent: this.agent, // TODO: rm?
      dispatcher: this.dispatcher, // TODO: add context flag if cache should be enabled (defaults to false)
    };
  }
}
