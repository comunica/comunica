import type { IActionHttp, IActorHttpOutput, IActorHttpArgs, MediatorHttp } from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import type { ActorHttpInvalidateListenable, IActionHttpInvalidate } from '@comunica/bus-http-invalidate';
import { KeysHttp } from '@comunica/context-entries';
import { ActionContextKey, passTest, failTest } from '@comunica/core';
import type { TestResult } from '@comunica/core';
import type { IMediatorTypeTime } from '@comunica/mediatortype-time';

export class ActorHttpRetry extends ActorHttp {
  private readonly activeDelays: Record<string, { date: Date; timeout: NodeJS.Timeout }>;
  private readonly httpInvalidator: ActorHttpInvalidateListenable;
  private readonly mediatorHttp: MediatorHttp;
  public readonly rateLimitRetryCount: number;
  public readonly rateLimitRetryDelayFallback: number;

  // Expression that matches dates expressed in the HTTP Date header format
  // eslint-disable-next-line max-len
  private static readonly dateRegex = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), [0-9]{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) [0-9]{4} [0-9]{2}:[0-9]{2}:[0-9]{2} GMT$/u;

  // Expression that matches numeric values of Retry-After
  private static readonly numberRegex = /^[0-9]+$/u;

  // Context key to indicate that the actor has already wrapped the given request
  private static readonly keyWrapped = new ActionContextKey<boolean>('urn:comunica:actor-http-retry#wrapped');

  public constructor(args: IActorHttpQueueArgs) {
    super(args);
    this.activeDelays = {};
    this.httpInvalidator = args.httpInvalidator;
    this.httpInvalidator.addInvalidateListener(action => this.handleHttpInvalidateEvent(action));
    this.mediatorHttp = args.mediatorHttp;
    this.rateLimitRetryCount = args.rateLimitRetryCount;
    this.rateLimitRetryDelayFallback = args.rateLimitRetryDelayFallback;
  }

  public async test(action: IActionHttp): Promise<TestResult<IMediatorTypeTime>> {
    if (action.context.has(ActorHttpRetry.keyWrapped)) {
      return failTest(`${this.name} can only wrap a request once`);
    }
    const retryCount = action.context.get(KeysHttp.httpRetryCount) ?? this.rateLimitRetryCount;
    if (!retryCount || retryCount < 1) {
      return failTest(`${this.name} requires a retry count greater than zero to function`);
    }
    return passTest({ time: 0 });
  }

  public async run(action: IActionHttp): Promise<IActorHttpOutput> {
    if (action.context.get(KeysHttp.httpRetryCount) === undefined) {
      return this.runRateLimitRetries(action);
    }

    const url = ActorHttp.getInputUrl(action.input);

    // Attempt once + the number of retries specified by the user
    const attemptLimit = action.context.getSafe(KeysHttp.httpRetryCount) + 1;
    const retryDelayFallback = action.context.get(KeysHttp.httpRetryDelayFallback) ?? 0;
    const retryDelayLimit = action.context.get(KeysHttp.httpRetryDelayLimit);
    const retryStatusCodes = action.context.get(KeysHttp.httpRetryStatusCodes);
    const retryOnError = ActorHttpRetry.isRetryableOnError(action);
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= attemptLimit; attempt++) {
      const retryDelay = this.getRetryDelay(url, retryDelayFallback);

      if (retryDelayLimit && retryDelay > retryDelayLimit) {
        this.logWarn(action.context, 'Requested delay exceeds the limit', () => ({
          url: url.href,
          delay: retryDelay,
          delayDate: this.activeDelays[url.host].date.toISOString(),
          delayLimit: retryDelayLimit,
          currentAttempt: `${attempt} / ${attemptLimit}`,
        }));
        break;
      } else if (retryDelay > 0 && attempt > 1) {
        this.logDebug(action.context, 'Delaying request', () => ({
          url: url.href,
          delay: retryDelay,
          currentAttempt: `${attempt} / ${attemptLimit}`,
        }));
        await ActorHttpRetry.sleep(retryDelay);
      }

      let response: IActorHttpOutput;
      try {
        response = await this.mediatorHttp.mediate({
          ...action,
          context: action.context.set(ActorHttpRetry.keyWrapped, true),
        });
        lastError = undefined;
      } catch (error: unknown) {
        // Timed out, aborted and non-retryable requests are not retried.
        if (!retryOnError || ActorHttpRetry.isTimeoutError(error) || ActorHttpRetry.isAbortedByCaller(action)) {
          throw error;
        }
        this.logDebug(action.context, 'Request failed without response', () => ({
          url: url.href,
          error: (<Error> error).message,
          currentAttempt: `${attempt} / ${attemptLimit}`,
        }));
        lastError = <Error> error;
        continue;
      }

      if (response.ok) {
        return response;
      }

      if (retryStatusCodes && retryStatusCodes.includes(response.status)) {
        this.logDebug(action.context, 'Status code in force retry list, forcing retry', () => ({
          url: url.href,
          status: response.status,
          statusText: response.statusText,
          currentAttempt: `${attempt} / ${attemptLimit}`,
        }));
        continue;
      }

      if (response.status === 504) {
        // When the server is acting as a proxy and the source times it, it makes sense to retry
        // with the hope that the source server replies within the timeout
        this.logDebug(action.context, 'Received proxy timeout', () => ({
          url: url.href,
          status: response.status,
          statusText: response.statusText,
          currentAttempt: `${attempt} / ${attemptLimit}`,
        }));
        continue;
      }

      if (ActorHttpRetry.isRateLimited(response)) {
        this.recordRetryAfter(action, url, response, `${attempt} / ${attemptLimit}`);
        this.logDebug(action.context, 'Server temporarily unavailable', () => ({
          url: url.href,
          status: response.status,
          statusText: response.statusText,
          currentAttempt: `${attempt} / ${attemptLimit}`,
        }));

        continue;
      }

      if (response.status >= 400 && response.status < 500) {
        // When the server reports a missing document, insufficient permissions, bad request or other error
        // in the 400 range except for the rate limit, it makes sense to skip further retries.
        // Sending the same, potentially invalid request for missing or inaccessible resources is unlikely to succeed.
        this.logDebug(action.context, 'Server reported client-side error', () => ({
          url: url.href,
          status: response.status,
          statusText: response.statusText,
          currentAttempt: `${attempt} / ${attemptLimit}`,
        }));
        break;
      }

      if (response.status >= 500 && response.status < 600) {
        // When a server-side error is encountered, it will likely not be fixable client-side,
        // and sending the same request again will most likely result in the same server-side failure.
        // Therefore, it makes sense not to retry on such errors at all.
        this.logDebug(action.context, 'Server-side error encountered, terminating', () => ({
          url: url.href,
          status: response.status,
          statusText: response.statusText,
          currentAttempt: `${attempt} / ${attemptLimit}`,
        }));
        break;
      }

      // Error codes not specifically handled should be logged as-is for user to notice
      this.logDebug(action.context, 'Request failed', () => ({
        url: url.href,
        status: response.status,
        statusText: response.statusText,
        currentAttempt: `${attempt} / ${attemptLimit}`,
      }));
    }

    throw lastError ?? new Error(`Request failed: ${url.href}`);
  }

  /**
   * Retry rate-limited requests, for when no retry count is set in the context.
   * All other responses and errors are passed through unchanged,
   * and so is the last rate-limited response once the retries are exhausted.
   * @param {IActionHttp} action The HTTP action.
   */
  public async runRateLimitRetries(action: IActionHttp): Promise<IActorHttpOutput> {
    const url = ActorHttp.getInputUrl(action.input);
    const attemptLimit = this.rateLimitRetryCount + 1;
    const retryDelayFallback = action.context.get(KeysHttp.httpRetryDelayFallback) ??
      this.rateLimitRetryDelayFallback;
    const retryDelayLimit = action.context.get(KeysHttp.httpRetryDelayLimit);
    const replayable = ActorHttp.isReplayableRequestBody(action);

    const retryOnConnectionLoss = ActorHttpRetry.isRetryableOnError(action);

    for (let attempt = 1; ; attempt++) {
      let response: IActorHttpOutput;
      try {
        response = await this.mediatorHttp.mediate({
          ...action,
          context: action.context.set(ActorHttpRetry.keyWrapped, true),
        });
      } catch (error: unknown) {
        // A lost connection says nothing about the request itself, so it is sent again on a new connection.
        if (!retryOnConnectionLoss || attempt === attemptLimit || !ActorHttpRetry.isConnectionLostError(error) ||
          ActorHttpRetry.isAbortedByCaller(action)) {
          throw error;
        }
        this.logDebug(action.context, 'Retrying request after the connection was lost', () => ({
          url: url.href,
          error: (<Error> error).message,
          currentAttempt: `${attempt} / ${attemptLimit}`,
        }));
        continue;
      }
      if (!ActorHttpRetry.isRateLimited(response) || attempt === attemptLimit || !replayable) {
        return response;
      }

      const currentAttempt = `${attempt} / ${attemptLimit}`;
      this.recordRetryAfter(action, url, response, currentAttempt);
      const retryDelay = this.getRetryDelay(url, retryDelayFallback);
      if (retryDelayLimit && retryDelay > retryDelayLimit) {
        this.logWarn(action.context, 'Requested delay exceeds the limit', () => ({
          url: url.href,
          delay: retryDelay,
          delayLimit: retryDelayLimit,
          currentAttempt,
        }));
        return response;
      }

      this.logDebug(action.context, 'Retrying rate-limited request', () => ({
        url: url.href,
        status: response.status,
        statusText: response.statusText,
        delay: retryDelay,
        currentAttempt,
      }));
      await response.body?.cancel();
      await ActorHttpRetry.sleep(retryDelay);
    }
  }

  /**
   * Check if the given error was caused by losing the connection to the server, such as when the server closed it,
   * as opposed to, e.g., not being able to connect at all.
   * @param {unknown} error An error, of which the cause may be the actual error.
   */
  public static isConnectionLostError(error: unknown): boolean {
    for (let current: any = error; current; current = current.cause) {
      if (ActorHttpRetry.connectionLostCodes.has(current.code) || /GOAWAY/u.test(current.message)) {
        return true;
      }
    }
    return false;
  }

  // Error codes of Node.js and undici for connections that were closed while a request was in flight
  private static readonly connectionLostCodes = new Set([ 'ECONNRESET', 'EPIPE', 'UND_ERR_SOCKET', 'UND_ERR_CLOSED' ]);

  /**
   * Check if the given response indicates that the server is rate-limiting or temporarily unavailable.
   * @param {IActorHttpOutput} response An HTTP response.
   */
  public static isRateLimited(response: IActorHttpOutput): boolean {
    // Status codes 429 (Too Many Requests) and 503 (Temporarily Unavailable) can have Retry-After
    return response.status === 429 || response.status === 503 ||
      // DBPedia SPARQL endpoint uses 405 instead of 429 and sends a Retry-After with it to indicate rate limits
      (response.status === 405 && response.headers.has('retry-after'));
  }

  /**
   * Record the delay requested by the Retry-After header of the given response for the host of the given URL.
   * @param {IActionHttp} action The HTTP action.
   * @param {URL} url The request URL.
   * @param {IActorHttpOutput} response An HTTP response.
   * @param {string} currentAttempt The current attempt, for logging.
   */
  protected recordRetryAfter(action: IActionHttp, url: URL, response: IActorHttpOutput, currentAttempt: string): void {
    const retryAfterHeader = response.headers.get('retry-after');
    if (!retryAfterHeader) {
      return;
    }
    const retryAfter = ActorHttpRetry.parseRetryAfterHeader(retryAfterHeader);
    if (retryAfter) {
      // Clear any previous clean-up timers for the host
      if (url.host in this.activeDelays) {
        clearTimeout(this.activeDelays[url.host].timeout);
      }
      // Record the current host-specific active delay, and add a clean-up timer for this new delay
      this.activeDelays[url.host] = {
        date: retryAfter,
        timeout: setTimeout(() => delete this.activeDelays[url.host], retryAfter.getTime() - Date.now()),
      };
    } else {
      this.logDebug(action.context, 'Invalid Retry-After header value from server', () => ({
        url: url.href,
        status: response.status,
        statusText: response.statusText,
        retryAfterHeader,
        currentAttempt,
      }));
    }
  }

  /**
   * Determine how long to wait before sending a request to the host of the given URL.
   * @param {URL} url The request URL.
   * @param {number} retryDelayFallback The delay if the host did not request one.
   */
  protected getRetryDelay(url: URL, retryDelayFallback: number): number {
    return url.host in this.activeDelays ?
      this.activeDelays[url.host].date.getTime() - Date.now() :
      retryDelayFallback;
  }

  /**
   * Check if the given request may be retried after it failed without a response.
   * The server may have processed such a request already,
   * so this only holds for idempotent methods and POST requests of SPARQL queries,
   * with a request body that can be sent again.
   * @param {IActionHttp} action The HTTP action.
   */
  public static isRetryableOnError(action: IActionHttp): boolean {
    if (!ActorHttp.isReplayableRequestBody(action)) {
      return false;
    }
    const method = ActorHttp.getRequestMethod(action);
    return ActorHttp.isIdempotentMethod(method) ||
      (method.toUpperCase() === 'POST' && ActorHttpRetry.isSparqlQueryBody(action.init));
  }

  /**
   * Check if the given request init contains a SPARQL query, as opposed to, e.g., a SPARQL update.
   * @param {RequestInit} init The request init.
   */
  public static isSparqlQueryBody(init: RequestInit | undefined): boolean {
    const body = init?.body;
    const contentType = new Headers(init?.headers).get('content-type')?.split(';')[0].trim().toLowerCase();
    if (contentType === 'application/sparql-query') {
      return true;
    }
    if (body instanceof URLSearchParams || (typeof body === 'string' &&
      contentType === 'application/x-www-form-urlencoded')) {
      const params = new URLSearchParams(body);
      return params.has('query') && !params.has('update');
    }
    return false;
  }

  /**
   * Check if the given error is caused by a timeout, such as from `KeysHttp.httpTimeout`.
   * These are not retried, as the request would likely time out again,
   * while the timeout would no longer bound the request duration.
   * @param {unknown} error An error.
   */
  public static isTimeoutError(error: unknown): boolean {
    return error instanceof Error && error.name === 'TimeoutError';
  }

  /**
   * Check if the caller aborted the given request.
   * @param {IActionHttp} action The HTTP action.
   */
  public static isAbortedByCaller(action: IActionHttp): boolean {
    return action.context.get(KeysHttp.httpAbortSignal)?.aborted === true || action.init?.signal?.aborted === true;
  }

  /**
   * Sleeps for the specified amount of time, using a timeout
   * @param {number} ms The amount of milliseconds to sleep
   */
  public static async sleep(ms: number): Promise<void> {
    if (ms > 0) {
      await new Promise(resolve => setTimeout(resolve, ms));
    }
  }

  /**
   * Parses a Retry-After HTTP header value following the specification:
   * https://httpwg.org/specs/rfc9110.html#field.retry-after
   * @param {string} retryAfter The raw header value as string
   * @returns The parsed Date object, or undefined in case of invalid header value
   */
  public static parseRetryAfterHeader(retryAfter: string): Date | undefined {
    if (ActorHttpRetry.numberRegex.test(retryAfter)) {
      return new Date(Date.now() + Number.parseInt(retryAfter, 10) * 1_000);
    }
    if (ActorHttpRetry.dateRegex.test(retryAfter)) {
      return new Date(retryAfter);
    }
  }

  /**
   * Handles HTTP cache invalidation events.
   * @param {IActionHttpInvalidate} action The invalidation action
   */
  public handleHttpInvalidateEvent(action: IActionHttpInvalidate): void {
    if (action.url && !URL.canParse(action.url)) {
      return;
    }
    const invalidatedHost = action.url ? new URL(action.url).host : undefined;
    for (const host of Object.keys(this.activeDelays)) {
      if (!invalidatedHost || host === invalidatedHost) {
        clearTimeout(this.activeDelays[host].timeout);
        delete this.activeDelays[host];
      }
    }
  }
}

export interface IActorHttpQueueArgs extends IActorHttpArgs {
  /**
   * The HTTP mediator.
   */
  mediatorHttp: MediatorHttp;
  /* eslint-disable max-len */
  /**
   * An actor that listens to HTTP invalidation events
   * @default {<default_invalidator> a <npmd:@comunica/bus-http-invalidate/^5.0.0/components/ActorHttpInvalidateListenable.jsonld#ActorHttpInvalidateListenable>}
   */
  httpInvalidator: ActorHttpInvalidateListenable;
  /* eslint-enable max-len */
  /**
   * The number of retries for rate-limited requests (status 429, 503, or 405 with a Retry-After header)
   * if no retry count is set in the context.
   * Other failed requests are only retried if a retry count is set in the context.
   * @range {integer}
   * @default {2}
   */
  rateLimitRetryCount: number;
  /**
   * The delay in milliseconds before retrying a rate-limited request without Retry-After header,
   * if no retry count and retry delay fallback are set in the context.
   * @range {integer}
   * @default {1000}
   */
  rateLimitRetryDelayFallback: number;
}
