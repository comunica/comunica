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
  }

  public async test(action: IActionHttp): Promise<TestResult<IMediatorTypeTime>> {
    if (action.context.has(ActorHttpRetry.keyWrapped)) {
      return failTest(`${this.name} can only wrap a request once`);
    }
    const retryCount = action.context.get(KeysHttp.httpRetryCount);
    if (!retryCount || retryCount < 1) {
      return failTest(`${this.name} requires a retry count greater than zero to function`);
    }
    return passTest({ time: 0 });
  }

  public async run(action: IActionHttp): Promise<IActorHttpOutput> {
    const url = ActorHttp.getInputUrl(action.input);

    // Attempt once + the number of retries specified by the user
    const attemptLimit = action.context.getSafe(KeysHttp.httpRetryCount) + 1;
    const retryDelayFallback = action.context.get(KeysHttp.httpRetryDelayFallback) ?? 0;
    const retryDelayLimit = action.context.get(KeysHttp.httpRetryDelayLimit);
    const retryStatusCodes = action.context.get(KeysHttp.httpRetryStatusCodes);

    for (let attempt = 1; attempt <= attemptLimit; attempt++) {
      const retryDelay = url.host in this.activeDelays ?
        this.activeDelays[url.host].date.getTime() - Date.now() :
        retryDelayFallback;

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

      const response = await this.mediatorHttp.mediate({
        ...action,
        context: action.context.set(ActorHttpRetry.keyWrapped, true),
      });

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

      if (
        // Status codes 429 (Too Many Requests) and 503 (Temporarily Unavailable) can have Retry-After
        response.status === 429 || response.status === 503 ||
        // DBPedia SPARQL endpoint uses 405 instead of 429 and sends a Retry-After with it to indicate rate limits
        (response.status === 405 && response.headers.has('retry-after'))
      ) {
        const retryAfterHeader = response.headers.get('retry-after');

        if (retryAfterHeader) {
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
              currentAttempt: `${attempt} / ${attemptLimit}`,
            }));
          }
        }

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

    throw new Error(`Request failed: ${url.href}`);
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
}
