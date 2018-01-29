import {ActorHttp, IActionHttp, IActorHttpOutput} from "@comunica/bus-http";
import {IActorArgs} from "@comunica/core";
import {IMediatorTypeTime} from "@comunica/mediatortype-time";
import "isomorphic-fetch";
import Requester from "./Requester";

/**
 * A comunica Follow Redirects Http Actor.
 */
export class ActorHttpNative extends ActorHttp {

  private requester: Requester;

  constructor(args: IActorHttpNativeArgs) {
    super(args);
    this.requester = new Requester(args.agentOptions ? JSON.parse(args.agentOptions) : undefined);
  }

  public async test(action: IActionHttp): Promise<IMediatorTypeTime> {
    // TODO: check for unsupported fetch features
    return { time: Infinity };
  }

  public async run(action: IActionHttp): Promise<IActorHttpOutput> {
    const options: any = {};
    // input can be a Request object or a string
    // if it is a Request object it can contain the same settings as the init object
    if ((<any> action.input).url) {
      options.url = (<Request> action.input).url;
      Object.assign(options, action.input);
    } else {
      options.url = action.input;
    }
    if (action.init) {
      Object.assign(options, action.init);
    }
    if (options.headers) {
      const headers: any = {};
      (<Headers> options.headers).forEach((val, key) => {
        headers[key] = val;
      });
      options.headers = headers;
    }

    options.method = options.method || 'GET';

    // not all options are supported

    return new Promise<IActorHttpOutput>((resolve, reject) => {
      const req = this.requester.createRequest(options);
      req.on('response', (httpResponse) => {
        // missing several of the required fetch fields
        const result = <IActorHttpOutput> {
          body: httpResponse,
          headers: new Headers(httpResponse.headers),
          ok: httpResponse.statusCode < 300,
          redirected: options.url !== httpResponse.responseUrl,
          status: httpResponse.statusCode,
          url: httpResponse.responseUrl,
        };
        resolve(result);
      });

      req.on('error', reject);
    });
  }

}

// Try to keep connections open, and set a maximum number of connections per server
// AGENT_SETTINGS = {keepAlive: true, maxSockets: 5};
export interface IActorHttpNativeArgs extends IActorArgs<IActionHttp, IMediatorTypeTime, IActorHttpOutput> {
  agentOptions?: string;
}
