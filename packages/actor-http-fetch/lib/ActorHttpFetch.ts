import type { IActionHttp, IActorHttpOutput, IActorHttpArgs } from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import { KeysHttp } from '@comunica/context-entries';
import type { IMediatorTypeTime } from '@comunica/mediatortype-time';
import type { Readable } from 'readable-stream';
import 'cross-fetch/polyfill';
import { FetchInitPreprocessor } from './FetchInitPreprocessor';
import type { IFetchInitPreprocessor } from './IFetchInitPreprocessor';

/**
 * A node-fetch actor that listens on the 'init' bus.
 *
 * It will call `fetch` with either action.input or action.url.
 */
export class ActorHttpFetch extends ActorHttp {
  private readonly userAgent: string;
  private readonly fetchInitPreprocessor: IFetchInitPreprocessor;

  public constructor(args: IActorHttpFetchArgs) {
    super(args);
    this.userAgent = ActorHttpFetch.createUserAgent();
    this.fetchInitPreprocessor = new FetchInitPreprocessor(args.agentOptions);
  }

  public static createUserAgent(): string {
    return `Comunica/actor-http-fetch (${typeof global.navigator === 'undefined' ?
      `Node.js ${process.version}; ${process.platform}` :
      `Browser-${global.navigator.userAgent}`})`;
  }

  public async test(action: IActionHttp): Promise<IMediatorTypeTime> {
    return { time: Number.POSITIVE_INFINITY };
  }

  /**
   * Perform a fetch request, taking care of retries
   * @param fetchFn
   * @param requestInput Url or RequestInfo to pass to fetchFn
   * @param requestInit RequestInit to pass to fetch function
   * @param retryCount Maximum retries after which to abort
   * @param retryDelay Time in milliseconds to wait between retries
   * @returns a fetch `Response` object
   */
  private static async getResponse(
    fetchFn: (input: RequestInfo | URL, init?: RequestInit | undefined) => Promise<Response>,
    requestInput: RequestInfo | URL,
    requestInit: RequestInit,
    retryCount: number,
    retryDelay: number,
    throwOnServerError: boolean,
  ): Promise<Response> {
    console.log(1);
    let lastError: unknown;
    // The retryCount is 0-based. Therefore, add 1 to triesLeft.
    let triesLeft = retryCount + 1;
    console.log('2');
    // When retry count is greater than 0, repeat fetch.
    while (triesLeft-- > 0) {
      console.log('3');
      try {
        console.log('3.1');
        console.log(fetchFn);
        console.log(requestInput);
        console.log(requestInit.headers);
        const response = await fetchFn(requestInput, requestInit);
        console.log('3.2');
        // Check, if server sent a 5xx error response.
        if (throwOnServerError && response.status >= 500 && response.status < 600) {
          console.log('3.3');
          throw new Error(`Server replied with response code ${response.status}: ${response.statusText}`);
          console.log('3.4');
        }
        console.log('4');
        return response;
      } catch (error: unknown) {
        console.log('5');
        lastError = error;
        // If the fetch was aborted by timeout, we won't retry.
        if (requestInit.signal?.aborted) {
          throw error;
        }
        console.log('6');
        if (triesLeft > 0) {
          // Wait for specified delay, before retrying.
          await new Promise((resolve, reject) => {
            console.log('7');
            setTimeout(resolve, retryDelay);
            // Cancel waiting, if timeout is reached.
            console.log('8');
            requestInit.signal?.addEventListener('abort', () => {
              reject(new Error('Fetch aborted by timeout.'));
            });
          });
        }
      }
    }
    console.log('9');
    // The fetch was not successful. We throw.
    if (retryCount > 0) {
      console.log('10');
      // Feedback the last error, if there were retry attempts.
      throw new Error(`Number of fetch retries (${retryCount}) exceeded. Last error: ${String(lastError)}`);
    } else {
      console.log('11');
      throw lastError;
    }
  }

  public async run(action: IActionHttp): Promise<IActorHttpOutput> {
    console.log('HTTP FETCH!!!!!!!!!!!!!!!!!');
    console.log(action.input);
    console.log(action.init);
    // Prepare headers
    const initHeaders = action.init?.headers ?? {};
    action.init = action.init ?? {};
    action.init.headers = new Headers(initHeaders);
    console.log('a');
    if (!action.init.headers.has('user-agent')) {
      action.init.headers.append('user-agent', this.userAgent);
    }
    const authString: string | undefined = action.context.get(KeysHttp.auth);
    if (authString) {
      action.init.headers.append('Authorization', `Basic ${Buffer.from(authString).toString('base64')}`);
    }
    console.log('b');
    // Log request
    this.logInfo(action.context, `Requesting ${typeof action.input === 'string' ?
      action.input :
      action.input.url}`, () => ({
      headers: ActorHttp.headersToHash(new Headers(action.init!.headers)),
      method: action.init!.method || 'GET',
    }));
    console.log('c');
    // TODO: remove this workaround once this has a fix: https://github.com/inrupt/solid-client-authn-js/issues/1708
    if (action.init?.headers && 'append' in action.init.headers && action.context.has(KeysHttp.fetch)) {
      action.init.headers = ActorHttp.headersToHash(action.init.headers);
    }
    console.log('d');
    let requestInit = { ...action.init };

    if (action.context.get(KeysHttp.includeCredentials)) {
      requestInit.credentials = 'include';
    }
    console.log('e');
    const httpTimeout: number | undefined = action.context?.get(KeysHttp.httpTimeout);
    let requestTimeout: NodeJS.Timeout | undefined;
    let onTimeout: (() => void) | undefined;
    if (httpTimeout !== undefined) {
      const controller = await this.fetchInitPreprocessor.createAbortController();
      requestInit.signal = controller.signal;
      onTimeout = () => controller.abort();
      requestTimeout = setTimeout(() => onTimeout!(), httpTimeout);
    }
    console.log('f');
    try {
      requestInit = await this.fetchInitPreprocessor.handle(requestInit);
      // Number of retries to perform after a failed fetch.
      const retryCount: number = action.context?.get(KeysHttp.httpRetryCount) ?? 0;
      const retryDelay: number = action.context?.get(KeysHttp.httpRetryDelay) ?? 0;
      const retryOnSeverError: boolean = action.context?.get(KeysHttp.httpRetryOnServerError) ?? false;
      const customFetch: ((input: RequestInfo, init?: RequestInit) => Promise<Response>) | undefined = action
        .context?.get(KeysHttp.fetch);
      console.log('g');
      // Execute the fetch (with retries and timeouts, if applicable).
      const response = await ActorHttpFetch.getResponse(
        customFetch || fetch, action.input, requestInit, retryCount, retryDelay, retryOnSeverError,
      );
      console.log('h');
      // We remove or update the timeout
      if (requestTimeout !== undefined) {
        const httpBodyTimeout = action.context?.get(KeysHttp.httpBodyTimeout) || false;
        if (httpBodyTimeout && response.body) {
          onTimeout = () => response.body?.cancel(new Error(`HTTP timeout when reading the body of ${response.url}.
This error can be disabled by modifying the 'httpBodyTimeout' and/or 'httpTimeout' options.`));
          (<Readable><any>response.body).on('close', () => {
            clearTimeout(requestTimeout);
          });
        } else {
          clearTimeout(requestTimeout);
        }
      }
      console.log('i');
      ActorHttp.normalizeResponseBody(response.body, requestTimeout);
      return response;
    } catch (error: unknown) {
      console.log('j');
      if (requestTimeout !== undefined) {
        clearTimeout(requestTimeout);
      }
      throw error;
    }
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
