import type { IActionHttp, IActorHttpArgs, IActorHttpOutput, MediatorHttp } from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import { KeysHttpWayback, KeysHttpProxy } from '@comunica/context-entries';
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
 * A Comunica actor to intercept HTTP requests to recover broken links using the WayBack Machine
 */
export class ActorHttpWayback extends ActorHttp {
  public readonly mediatorHttp: MediatorHttp;

  public constructor(args: IActorHttpWaybackArgs) {
    super(args);
  }

  public async test(action: IActionHttp): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionHttp): Promise<IActorHttpOutput> {
    let result = await this.mediatorHttp.mediate(action);

    if (result.status === 404 && action.context.get(KeysHttpWayback.recoverBrokenLinks)) {
      let fallbackResult = await this.mediatorHttp.mediate({
        ...action,
        context: action.context
          .set(KeysHttpWayback.recoverBrokenLinks, false)
          .set<IProxyHandler>(KeysHttpProxy.httpProxyHandler, { getProxy: getProxyHandler(action.context) }),
      });

      // If the wayback machine returns a 200 status then use that result
      if (fallbackResult.status === 200) {
        [ result, fallbackResult ] = [ fallbackResult, result ];
      }

      // Consume stream to avoid process
      const { body } = fallbackResult;
      if (body) {
        if ('destroy' in body && typeof (<any>body).destroy === 'function') {
          (<any>body).destroy();
        } else {
          await stringifyStream(ActorHttp.toNodeReadable(fallbackResult.body));
        }
      }
    }

    return result;
  }
}

export interface IActorHttpWaybackArgs extends IActorHttpArgs {
  mediatorHttp: MediatorHttp;
}
