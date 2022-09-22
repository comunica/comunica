import type { MediatorHttp } from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import type {
  IActionHttpIntercept,
  IActorHttpInterceptArgs,
  IActorHttpInterceptOutput,
} from '@comunica/bus-http-intercept';
import { ActorHttpIntercept } from '@comunica/bus-http-intercept';
import { KeysHttpInterceptWayback, KeysHttpProxy } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
import type { IActionContext, IProxyHandler, IRequest } from '@comunica/types';
import { Request } from 'cross-fetch';
import * as stringifyStream from 'stream-to-string';

const WAYBACK_URL = 'http://wayback.archive-it.org/';

function addWayback(action: IRequest): IRequest {
  const request = new Request(action.input, action.init);
  return {
    input: new Request(new URL(`/${request.url}`, WAYBACK_URL), request),
  };
}

function getProxyHandler(context: IActionContext): (action: IRequest) => Promise<IRequest> {
  const handler = context.get<IProxyHandler>(KeysHttpProxy.httpProxyHandler);
  if (handler) {
    return (action: IRequest) => handler.getProxy(addWayback(action));
  }
  return (action: IRequest) => Promise.resolve(addWayback(action));
}

/**
 * A Comunica actor to intercept HTTP requests to recover broken links using the WayBack  Machine
 */
export class ActorHttpInterceptWayback extends ActorHttpIntercept {
  public readonly mediatorHttp: MediatorHttp;

  public constructor(args: IActorHttpInterceptWaybackArgs) {
    super(args);
  }

  public async test(action: IActionHttpIntercept): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionHttpIntercept): Promise<IActorHttpInterceptOutput> {
    let result = await this.mediatorHttp.mediate(action);

    if (result.status === 404 && action.context.get(KeysHttpInterceptWayback.recoverBrokenLinks)) {
      let fallbackResult = await this.mediatorHttp.mediate({
        ...action,
        context: action.context
          .set(KeysHttpInterceptWayback.recoverBrokenLinks, false)
          .set<IProxyHandler>(KeysHttpProxy.httpProxyHandler, { getProxy: getProxyHandler(action.context) }),
      });

      // If the wayback machine returns a 200 status then use that result
      if (fallbackResult.status === 200) {
        [ result, fallbackResult ] = [ fallbackResult, result ];
      }

      // Consume stream to avoid process
      if (fallbackResult.body) {
        await stringifyStream(ActorHttp.toNodeReadable(fallbackResult.body));
      }
    }

    return result;
  }
}

export interface IActorHttpInterceptWaybackArgs extends IActorHttpInterceptArgs {
  mediatorHttp: MediatorHttp;
}
