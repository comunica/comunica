import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import type { IFetchInitPreprocessor } from './IFetchInitPreprocessor';

/**
 * Overrides the HTTP agent to perform better.
 */
export class FetchInitPreprocessor implements IFetchInitPreprocessor {
  private readonly agent: (url: URL) => HttpAgent;

  public constructor(agentOptions: any) {
    const httpAgent = new HttpAgent(agentOptions);
    const httpsAgent = new HttpsAgent(agentOptions);
    this.agent = (_parsedURL: URL): HttpAgent => _parsedURL.protocol === 'http:' ? httpAgent : httpsAgent;
  }

  public handle(init: RequestInit): RequestInit {
    return <any> { ...init, agent: this.agent };
  }
}
