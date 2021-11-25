import type { Readable } from 'stream';
import type { IActionHttp, IActorHttpOutput } from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import { KeysHttp } from '@comunica/context-entries';
import type { IActorArgs } from '@comunica/core';
import type { IMediatorTypeTime } from '@comunica/mediatortype-time';
import 'cross-fetch/polyfill';
import { FetchInitPreprocessor } from './FetchInitPreprocessor';
import type { IFetchInitPreprocessor } from './IFetchInitPreprocessor';

/**
 * A node-fetch actor that listens on the 'init' bus.
 *
 * It will call `fetch` with either action.input or action.url.
 */
export class ActorHttpNodeFetch extends ActorHttp {
  private readonly userAgent: string;
  private readonly fetchInitPreprocessor: IFetchInitPreprocessor;

  public constructor(args: IActorHttpNodeFetchArgs) {
    super(args);
    this.userAgent = ActorHttpNodeFetch.createUserAgent();
    this.fetchInitPreprocessor = new FetchInitPreprocessor(args.agentOptions);
  }

  public static createUserAgent(): string {
    return `Comunica/actor-http-node-fetch (${typeof global.navigator === 'undefined' ?
      `Node.js ${process.version}; ${process.platform}` :
      `Browser-${global.navigator.userAgent}`})`;
  }

  public async test(action: IActionHttp): Promise<IMediatorTypeTime> {
    return { time: Number.POSITIVE_INFINITY };
  }

  public run(action: IActionHttp): Promise<IActorHttpOutput> {
    // Prepare headers
    const initHeaders = action.init ? action.init.headers || {} : {};
    action.init = action.init ? action.init : {};
    action.init.headers = new Headers(initHeaders);
    if (!action.init.headers.has('user-agent')) {
      action.init.headers.append('user-agent', this.userAgent);
    }
    if (action.context && action.context.get(KeysHttp.auth)) {
      action.init.headers.append('Authorization', `Basic ${Buffer.from(action.context.get(KeysHttp.auth)).toString('base64')}`);
    }

    // Log request
    this.logInfo(action.context, `Requesting ${typeof action.input === 'string' ?
      action.input :
      action.input.url}`, () => ({
      headers: ActorHttp.headersToHash(new Headers(action.init!.headers)),
      method: action.init!.method || 'GET',
    }));

    // TODO: remove this workaround once this has a fix: https://github.com/inrupt/solid-client-authn-js/issues/1708
    if (action.init && action.init.headers && 'append' in action.init.headers && action.context?.has(KeysHttp.fetch)) {
      action.init.headers = ActorHttp.headersToHash(action.init.headers);
    }

    // Perform request
    const customFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response> = action
      .context?.get(KeysHttp.fetch);
    return (customFetch || fetch)(action.input, this.fetchInitPreprocessor.handle({
      ...action.init,
      ...action.context && action.context.get(KeysHttp.includeCredentials) ? { credentials: 'include' } : {},
    })).then(response => {
      // Node-fetch does not support body.cancel, while it is mandatory according to the fetch and readablestream api.
      // If it doesn't exist, we monkey-patch it.
      if (response.body && !response.body.cancel) {
        response.body.cancel = async(error?: Error) => (<Readable> <any> response.body).destroy(error);
      }
      return response;
    });
  }
}

export interface IActorHttpNodeFetchArgs extends IActorArgs<IActionHttp, IMediatorTypeTime, IActorHttpOutput> {
  /**
   * The agent options for the HTTP agent
   * @range {json}
   * @default {{ "keepAlive": true, "maxSockets": 5 }}
   */
  agentOptions?: Record<string, any>;
}
