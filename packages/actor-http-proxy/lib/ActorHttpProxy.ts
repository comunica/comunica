import type { IActionHttp, IActorHttpOutput } from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import { KeysHttpProxy } from '@comunica/context-entries';
import type { IActorArgs, IActorTest, Mediator } from '@comunica/core';
import type { IMediatorTypeTime } from '@comunica/mediatortype-time';
import type { IProxyHandler } from './IProxyHandler';

/**
 * A comunica Proxy Http Actor.
 */
export class ActorHttpProxy extends ActorHttp {
  public readonly mediatorHttp: Mediator<ActorHttp, IActionHttp, IActorTest, IActorHttpOutput>;

  public constructor(args: IActorHttpProxyArgs) {
    super(args);
  }

  public async test(action: IActionHttp): Promise<IMediatorTypeTime> {
    if (!action.context) {
      throw new Error(`Actor ${this.name} could not find a context.`);
    }
    const proxyHandler: IProxyHandler = action.context.get(KeysHttpProxy.httpProxyHandler);
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
    if (!action.context) {
      throw new Error('Illegal state: missing context');
    }
    const proxyHandler: IProxyHandler = action.context.get(KeysHttpProxy.httpProxyHandler);

    // Send a request for the modified request
    const output = await this.mediatorHttp.mediate({
      ...await proxyHandler.getProxy(action),
      context: action.context.delete(KeysHttpProxy.httpProxyHandler),
    });

    // Modify the response URL
    (<any> output).url = output.headers.get('x-final-url') ?? requestedUrl;
    return output;
  }
}

export interface IActorHttpProxyArgs extends IActorArgs<IActionHttp, IActorTest, IActorHttpOutput> {
  mediatorHttp: Mediator<ActorHttp, IActionHttp, IActorTest, IActorHttpOutput>;
}

/**
 * @deprecated Import this constant from @comunica/context-entries.
 */
export const KEY_CONTEXT_HTTPPROXYHANDLER = KeysHttpProxy.httpProxyHandler;
