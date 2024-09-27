import type { IActionHttp, IActorHttpOutput, IActorHttpArgs } from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import { KeysHttp } from '@comunica/context-entries';
import type { TestResult } from '@comunica/core';
import { passTest } from '@comunica/core';
import type { IMediatorTypeTime } from '@comunica/mediatortype-time';

// eslint-disable-next-line import/extensions
import { version as actorVersion } from '../package.json';

import { FetchInitPreprocessor } from './FetchInitPreprocessor';
import type { IFetchInitPreprocessor } from './IFetchInitPreprocessor';

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class ActorHttpFetch extends ActorHttp {
  private readonly fetchInitPreprocessor: IFetchInitPreprocessor;

  private static readonly userAgent = ActorHttp.createUserAgent('ActorHttpFetch', actorVersion);

  public constructor(args: IActorHttpFetchArgs) {
    super(args);
    this.fetchInitPreprocessor = new FetchInitPreprocessor(args.agentOptions);
  }

  public async test(_action: IActionHttp): Promise<TestResult<IMediatorTypeTime>> {
    return passTest({ time: Number.POSITIVE_INFINITY });
  }

  public async run(action: IActionHttp): Promise<IActorHttpOutput> {
    const headers = this.prepareRequestHeaders(action);

    const init: RequestInit = { method: 'GET', ...action.init, headers };

    this.logInfo(action.context, `Requesting ${ActorHttp.getInputUrl(action.input).href}`, () => ({
      headers: ActorHttp.headersToHash(headers),
      method: init.method,
    }));

    // TODO: remove this workaround once this has a fix: https://github.com/inrupt/solid-client-authn-js/issues/1708
    if (action.context.has(KeysHttp.fetch)) {
      init.headers = ActorHttp.headersToHash(headers);
    }

    if (action.context.get(KeysHttp.includeCredentials)) {
      init.credentials = 'include';
    }

    const httpTimeout = action.context.get<number>(KeysHttp.httpTimeout);
    const httpBodyTimeout = action.context.get<boolean>(KeysHttp.httpBodyTimeout);
    const fetchFunction = action.context.get<Fetch>(KeysHttp.fetch) ?? fetch;
    const requestInit = await this.fetchInitPreprocessor.handle(init);

    let timeoutCallback: () => void;
    let timeoutHandle: NodeJS.Timeout | undefined;

    if (httpTimeout) {
      const abortController = new AbortController();
      requestInit.signal = abortController.signal;
      timeoutCallback = () => abortController.abort(new Error(`Fetch timed out for ${ActorHttp.getInputUrl(action.input).href} after ${httpTimeout} ms`));
      timeoutHandle = setTimeout(() => timeoutCallback(), httpTimeout);
    }

    const response = await fetchFunction(action.input, requestInit);

    if (httpTimeout && (!httpBodyTimeout || !response.body)) {
      clearTimeout(timeoutHandle);
    }

    return response;
  }

  /**
   * Prepares the request headers, taking into account the environment.
   * @param {IActionHttp} action The HTTP action
   * @returns {Headers} Headers
   */
  public prepareRequestHeaders(action: IActionHttp): Headers {
    const headers = new Headers(action.init?.headers);

    if (ActorHttp.isBrowser()) {
      // When running in a browser, the User-Agent header should never be set
      headers.delete('user-agent');
    } else if (!headers.has('user-agent')) {
      // Otherwise, if no header value is provided, use the actor one
      headers.set('user-agent', ActorHttpFetch.userAgent!);
    }

    const authString = action.context.get<string>(KeysHttp.auth);
    if (authString) {
      headers.set('Authorization', `Basic ${Buffer.from(authString).toString('base64')}`);
    }

    return headers;
  }
}

export interface IActorHttpFetchArgs extends IActorHttpArgs {
  /**
   * The agent options for the HTTP agent
   * @range {json}
   * @default {{ "keepAlive": true, "maxSockets": 5 }}
   */
  agentOptions?: Record<string, any>;
}
