import {ActorHttp, IActionHttp, IActorHttpOutput} from "@comunica/bus-http";
import {IActorArgs, IActorTest, Mediator} from "@comunica/core";
import {IMediatorTypeTime} from "@comunica/mediatortype-time";
import {IProxyHandler} from "./IProxyHandler";

/**
 * A comunica Proxy Http Actor.
 */
export class ActorHttpProxy extends ActorHttp {

  public readonly mediatorHttp: Mediator<ActorHttp, IActionHttp, IActorTest, IActorHttpOutput>;

  constructor(args: IActorHttpProxyArgs) {
    super(args);
  }

  public async test(action: IActionHttp): Promise<IMediatorTypeTime> {
    const proxyHandler: IProxyHandler = action.context.get(KEY_CONTEXT_HTTPPROXYHANDLER);
    if (!proxyHandler) {
      throw new Error(`Actor ${this.name} could not find a proxy handler in the context.`);
    }
    if (!await proxyHandler.getProxy(action)) {
      throw new Error(`Actor ${this.name} could not determine a proxy for the given request.`);
    }
    return { time: Infinity };
  }

  public async run(action: IActionHttp): Promise<IActorHttpOutput> {
    const requestedUrl = typeof action.input === 'string' ? action.input : action.input.url;
    const proxyHandler: IProxyHandler = action.context.get(KEY_CONTEXT_HTTPPROXYHANDLER);

    // Send a request for the modified request
    const output = await this.mediatorHttp.mediate({
      ...await proxyHandler.getProxy(action),
      context: action.context.delete(KEY_CONTEXT_HTTPPROXYHANDLER),
    });

    // Modify the response URL
    (<any> output).url = output.headers.get('x-final-url') || requestedUrl;
    return output;
  }

}

export interface IActorHttpProxyArgs extends IActorArgs<IActionHttp, IActorTest, IActorHttpOutput> {
  mediatorHttp: Mediator<ActorHttp, IActionHttp, IActorTest, IActorHttpOutput>;
}

export const KEY_CONTEXT_HTTPPROXYHANDLER: string = '@comunica/actor-http-proxy:httpProxyHandler';
