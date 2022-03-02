import type { IActionHttp, IActorHttpOutput, MediatorHttp, IActorHttpArgs } from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import { KeysHttpProxy } from '@comunica/context-entries';
import type { IMediatorTypeTime } from '@comunica/mediatortype-time';
import type { IProxyHandler } from '@comunica/types';

/**
 * A comunica Proxy Http Actor.
 */
export class ActorHttpProxy extends ActorHttp {
  public readonly mediatorHttp: MediatorHttp;

  public constructor(args: IActorHttpProxyArgs) {
    super(args);
  }

  public async test(action: IActionHttp): Promise<IMediatorTypeTime> {
    const proxyHandler: IProxyHandler | undefined = action.context.get(KeysHttpProxy.httpProxyHandler);
    if (!proxyHandler) {
      throw new Error(`Actor ${this.name} could not find a proxy handler in the context.`);
    }
    if (!await proxyHandler.getProxy(action)) {
      throw new Error(`Actor ${this.name} could not determine a proxy for the given request.`);
    }
    return { time: Number.POSITIVE_INFINITY };
  }

  public async run(action: IActionHttp): Promise<IActorHttpOutput> {
    const requestedUrl = typeof action.input === 'string' ? action.input : action.input.url;
    const proxyHandler: IProxyHandler = action.context.get(KeysHttpProxy.httpProxyHandler)!;

    // Send a request for the modified request
    const output = await this.mediatorHttp.mediate({
      ...await proxyHandler.getProxy(action),
      context: action.context.delete(KeysHttpProxy.httpProxyHandler),
    });

    // Modify the response URL
    // use defineProperty to allow modification of unmodifiable objects
    Object.defineProperty(output, 'url', {
      configurable: true,
      enumerable: true,
      get: () => output.headers.get('x-final-url') ?? requestedUrl,
    });
    return output;
  }
}

export interface IActorHttpProxyArgs extends IActorHttpArgs {
  /**
   * The HTTP mediator
   */
  mediatorHttp: MediatorHttp;
}
