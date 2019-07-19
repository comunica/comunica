/**
 * A proxy handler can override a request.
 */
export interface IProxyHandler {
  /**
   * Get a new proxied request for a given request.
   * If the given request is not applicable, null can be returned.
   * @param {IRequest} request A request.
   * @return {Promise<IRequest>} A new request, or null.
   */
  getProxy(request: IRequest): Promise<IRequest>;
}

/**
 * A request that conforms to the fetch interface.
 */
export interface IRequest {
  input: RequestInfo;
  init?: RequestInit;
}
