import type { IProxyHandler, IRequest } from './IProxyHandler';

/**
 * A proxy handler that prefixes all URLs with a given string.
 */
export class ProxyHandlerStatic implements IProxyHandler {
  private readonly prefixUrl: string;

  public constructor(prefixUrl: string) {
    this.prefixUrl = prefixUrl;
  }

  public async getProxy(request: IRequest): Promise<IRequest> {
    return {
      init: request.init,
      input: this.modifyInput(request.input),
    };
  }

  public modifyInput(input: RequestInfo): RequestInfo {
    if (typeof input === 'string') {
      return this.prefixUrl + input;
    }
    return new Request(this.prefixUrl + input.url, input);
  }
}
