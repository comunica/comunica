import type { IActionHttp, IActorHttpOutput, IActorHttpArgs } from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import { KeysHttp } from '@comunica/context-entries';
import type { IMediatorTypeTime } from '@comunica/mediatortype-time';
import 'cross-fetch/polyfill';
import Requester from './Requester';

/**
 * A comunica Follow Redirects Http Actor.
 */
export class ActorHttpNative extends ActorHttp {
  private readonly userAgent: string;

  private readonly requester: Requester;

  public constructor(args: IActorHttpNativeArgs) {
    super(args);
    this.userAgent = ActorHttpNative.createUserAgent();
    this.requester = new Requester(args.agentOptions);
  }

  public static createUserAgent(): string {
    return `Comunica/actor-http-native (${typeof global.navigator === 'undefined' ?
      `Node.js ${process.version}; ${process.platform}` :
      `Browser-${global.navigator.userAgent}`})`;
  }

  public async test(action: IActionHttp): Promise<IMediatorTypeTime> {
    return { time: Number.POSITIVE_INFINITY };
  }

  public async run(action: IActionHttp): Promise<IActorHttpOutput> {
    const options: any = {};
    // Input can be a Request object or a string
    // if it is a Request object it can contain the same settings as the init object
    if ((<any>action.input).url) {
      options.url = (<Request>action.input).url;
      Object.assign(options, action.input);
    } else {
      options.url = action.input;
    }

    if (action.init) {
      Object.assign(options, action.init);
      options.headers = new Headers(action.init.headers);
      options.body = action.init.body;
    } else {
      options.headers = (<Request>action.input).headers;
      if ((<Request>action.input).body) {
        throw new Error(`ActorHttpNative does not support passing body via input, use init instead.`);
      }
    }

    if (!options.headers) {
      options.headers = new Headers();
    }
    if (!options.headers.has('user-agent')) {
      options.headers.append('user-agent', this.userAgent);
    }

    options.method = options.method || 'GET';
    if (action.context.get(KeysHttp.includeCredentials)) {
      options.withCredentials = true;
    }

    if (action.context.get(KeysHttp.auth)) {
      options.auth = action.context.get(KeysHttp.auth);
    }

    this.logInfo(action.context, `Requesting ${options.url}`, () => ({
      headers: ActorHttp.headersToHash(options.headers),
      method: options.method,
    }));

    // Not all options are supported

    return new Promise<IActorHttpOutput>((resolve, reject) => {
      const req = this.requester.createRequest(options);
      req.on('error', reject);
      req.on('response', httpResponse => {
        httpResponse.on('error', (error: Error) => {
          httpResponse = null;
          reject(error);
        });
        // Avoid memory leak on HEAD requests
        if (options.method === 'HEAD') {
          httpResponse.destroy();
        }
        // Using setImmediate so error can be caught should it be thrown
        setTimeout(() => {
          if (httpResponse) {
            // Expose fetch cancel promise
            httpResponse.cancel = () => {
              httpResponse.destroy();
              return Promise.resolve();
            };

            // Support abort controller
            if (action.init?.signal) {
              if (action.init.signal.aborted) {
                httpResponse.destroy();
              } else {
                action.init.signal.addEventListener('abort', () => httpResponse.destroy());
              }
            }

            // Missing several of the required fetch fields
            const headers = httpResponse.headers;

            const result = <IActorHttpOutput> {
              body: httpResponse,
              headers,
              ok: httpResponse.statusCode < 300,
              redirected: options.url !== httpResponse.responseUrl,
              status: httpResponse.statusCode,
              // When the content came from another resource because of conneg, let Content-Location deliver the url
              url: headers.has('content-location') ? headers.get('content-location') : httpResponse.responseUrl,
            };
            resolve(result);
          }
        });
      });
    });
  }
}

export interface IActorHttpNativeArgs extends IActorHttpArgs {
  /**
   * The agent options for the HTTP agent
   * @range {json}
   * @default {{ "keepAlive": true, "maxSockets": 5 }}
   */
  agentOptions?: Record<string, any>;
}
