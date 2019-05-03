import {ActorHttp, IActionHttp, IActorHttpOutput} from "@comunica/bus-http";
import {IActorArgs} from "@comunica/core";
import {IMediatorTypeTime} from "@comunica/mediatortype-time";
import "isomorphic-fetch";
import Requester from "./Requester";

/**
 * A comunica Follow Redirects Http Actor.
 */
export class ActorHttpNative extends ActorHttp {

  private readonly userAgent: string;

  private requester: Requester;

  constructor(args: IActorHttpNativeArgs) {
    super(args);
    this.userAgent = ActorHttpNative.createUserAgent();
    this.requester = new Requester(args.agentOptions ? JSON.parse(args.agentOptions) : undefined);
  }

  public static createUserAgent(): string {
    return `Comunica/actor-http-native (${typeof window === 'undefined'
      ? 'Node.js ' + process.version + '; ' + process.platform : 'Browser-' + window.navigator.userAgent})`;
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
      (<Headers> options.headers).forEach((val: any, key: any) => {
        headers[key] = val;
      });
      options.headers = headers;
    } else {
      options.headers = {};
    }
    if (!options.headers['user-agent']) {
      options.headers['user-agent'] = this.userAgent;
    }

    options.method = options.method || 'GET';

    this.logInfo(action.context, `Requesting ${options.url}`);

    // not all options are supported

    return new Promise<IActorHttpOutput>((resolve, reject) => {
      const req = this.requester.createRequest(options);
      req.on('error', reject);
      req.on('response', (httpResponse) => {
        httpResponse.on('error', (e: Error) => {
          httpResponse = null;
          reject(e);
        });
        // Avoid memory leak on HEAD requests
        if (options.method === 'HEAD') {
          httpResponse.destroy();
        }
        // using setImmediate so error can be caught should it be thrown
        setImmediate(() => {
          if (httpResponse) {
            // Expose fetch cancel promise
            httpResponse.cancel = () => Promise.resolve(httpResponse.destroy());
            // missing several of the required fetch fields
            const headers = new Headers(httpResponse.headers);
            const result = <IActorHttpOutput> {
              body: httpResponse,
              headers,
              ok: httpResponse.statusCode < 300,
              redirected: options.url !== httpResponse.responseUrl,
              status: httpResponse.statusCode,
              // when the content came from another resource because of conneg, let Content-Location deliver the url
              url: headers.has('content-location') ? headers.get('content-location') : httpResponse.responseUrl,
            };
            resolve(result);
          }
        });
      });
    });
  }

}

// Try to keep connections open, and set a maximum number of connections per server
// AGENT_SETTINGS = {keepAlive: true, maxSockets: 5};
export interface IActorHttpNativeArgs extends IActorArgs<IActionHttp, IMediatorTypeTime, IActorHttpOutput> {
  agentOptions?: string;
}
