import {ActorHttp, IActionHttp, IActorHttpOutput, IActorHttpTest} from "@comunica/bus-http/lib/ActorHttp";
import {IActorArgs} from "@comunica/core/lib/Actor";
import fetch from "node-fetch";

/**
 * A Hello World actor that listens to on the 'init' bus.
 *
 * It takes an optional `hello` parameter, which defaults to 'Hello'.
 * When run, it will print the `hello` parameter to the console,
 * followed by all arguments it received.
 */
export class ActorHttpNodeFetch extends ActorHttp {

  constructor(args: IActorArgs<IActionHttp, IActorHttpTest, IActorHttpOutput>) {
    super(args);
  }

  public async test(action: IActionHttp): Promise<IActorHttpTest> {
    return { time: Infinity };
  }

  public run(action: IActionHttp): Promise<IActorHttpOutput> {
    return fetch(action.url, action);
  }

}
