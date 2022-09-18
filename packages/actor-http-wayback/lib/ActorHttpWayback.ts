import type { IActionHttp, IActorHttpOutput, IActorHttpArgs, MediatorHttp } from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import { KeysHttp, KeysHttpProxy } from '@comunica/context-entries';
import type { IMediatorTypeTime } from '@comunica/mediatortype-time';
import { IActionContext, IProxyHandler, IRequest } from '@comunica/types';
import { URL } from 'url';

const WAYBACK_URL = 'http://wayback.archive-it.org/';

function addWayback(action: IRequest): IRequest {
  const request = new Request(action.input, action.init);
  return {
    input: new Request(new URL(request.url, WAYBACK_URL), request)
  }
}

function getProxyHandler(context: IActionContext) {
  const handler = context.get<IProxyHandler>(KeysHttpProxy.httpProxyHandler);
  if (handler) {
    return (action: IRequest) => handler.getProxy(addWayback(action))
  }
  return (action: IRequest) => Promise.resolve(addWayback(action));
}

/**
 * A Comunica actor to lookup links with the WayBack machine
 */
export class ActorHttpWayback extends ActorHttp {
  public readonly mediatorHttp: MediatorHttp;

  public constructor(args: IActorHttpWaybackArgs) {
    super(args);
  }

  public async test(action: IActionHttp): Promise<IMediatorTypeTime> {
    if (action.context.get(KeysHttp.recoverBrokenLinks) !== true) {
      throw new Error(
        `Actor \${this.name} can only run if recoverBrokenLinks is set to true, received ${
          KeysHttp.recoverBrokenLinks.name}`,
      );
    }
    return { time: Number.POSITIVE_INFINITY };
  }

  public async run(action: IActionHttp): Promise<IActorHttpOutput> {
    // const request = new Request(action.input, action.init);
    // const input = new Request(new URL(request.url, WAYBACK_URL), request);

    return this.mediatorHttp.mediate({
      ...action,
      context: action.context
        .set(KeysHttp.recoverBrokenLinks, false)
        .set<IProxyHandler>(KeysHttpProxy.httpProxyHandler, { getProxy: getProxyHandler(action.context) })
    });
  }
}

export interface IActorHttpWaybackArgs extends IActorHttpArgs {
  mediatorHttp: MediatorHttp;
}
