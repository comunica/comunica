import {ActorHttp, IActionHttp, IActorHttpOutput} from "@comunica/bus-http";
import {IActorArgs} from "@comunica/core";
import {IMediatorTypeTime} from "@comunica/mediatortype-time";
import "isomorphic-fetch";

/**
 * A node-fetch actor that listens on the 'init' bus.
 *
 * It will call `fetch` with either action.input or action.url.
 */
export class ActorHttpNodeFetch extends ActorHttp {

  constructor(args: IActorArgs<IActionHttp, IMediatorTypeTime, IActorHttpOutput>) {
    super(args);
  }

  public async test(action: IActionHttp): Promise<IMediatorTypeTime> {
    return { time: Infinity };
  }

  public run(action: IActionHttp): Promise<IActorHttpOutput> {
    this.logInfo(action.context, `Requesting ${typeof action.input === 'string'
      ? action.input : action.input.url}`);
    return fetch(action.input, action.init);
  }

}
