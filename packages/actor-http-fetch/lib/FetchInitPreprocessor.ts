/* eslint-disable import/no-nodejs-modules */
import { Agent as HttpAgent } from 'node:http';
import { Agent as HttpsAgent } from 'node:https';

/* eslint-enable import/no-nodejs-modules */
import type { IFetchInitPreprocessor } from './IFetchInitPreprocessor';

/**
 * Overrides the HTTP agent to perform better in Node.js.
 */
export class FetchInitPreprocessor implements IFetchInitPreprocessor {
  private readonly agent: (url: URL) => HttpAgent;

  public constructor(agentOptions: any) {
    const httpAgent = new HttpAgent(agentOptions);
    const httpsAgent = new HttpsAgent(agentOptions);
    this.agent = (_parsedURL: URL): HttpAgent => _parsedURL.protocol === 'http:' ? httpAgent : httpsAgent;
  }

  public async handle(init: RequestInit): Promise<RequestInit & { agent: (url: URL) => HttpAgent }> {
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
    };
  }
}
