import { ActorHttp, IActionHttp, IActorHttpOutput, KEY_CONTEXT_INCLUDE_CREDENTIALS } from '@comunica/bus-http';
import { KEY_CONTEXT_SOURCE } from '@comunica/bus-rdf-resolve-quad-pattern';
import { IActorArgs } from '@comunica/core';
import { IMediatorTypeTime } from '@comunica/mediatortype-time';
import 'cross-fetch/polyfill';

/**
 * A node-fetch actor that listens on the 'init' bus.
 *
 * It will call `fetch` with either action.input or action.url.
 */
export class ActorHttpNodeFetch extends ActorHttp {
  public constructor(args: IActorArgs<IActionHttp, IMediatorTypeTime, IActorHttpOutput>) {
    super(args);
  }

  public async test(action: IActionHttp): Promise<IMediatorTypeTime> {
    return { time: Infinity };
  }

  public run(action: IActionHttp): Promise<IActorHttpOutput> {
    this.logInfo(action.context, `Requesting ${typeof action.input === 'string' ?
      action.input :
      action.input.url}`);
    if (action.context && action.context.get(KEY_CONTEXT_SOURCE)) {
      const source = action.context.get(KEY_CONTEXT_SOURCE);
      if (source.username && source.password) {
        const initHeaders = action.init ? action.init.headers || {} : {};
        action.init = action.init ? action.init : {};
        action.init.headers = new Headers(initHeaders);
        action.init.headers.append('Authorization', `Basic ${Buffer.from(`${source.username}:${source.password}`).toString('base64')}`);
        action.context.set(KEY_CONTEXT_INCLUDE_CREDENTIALS, true);
      }
    }
    return fetch(action.input, {
      ...action.init,
      ...action.context && action.context.get(KEY_CONTEXT_INCLUDE_CREDENTIALS) ? { credentials: 'include' } : {},
    });
  }
}
