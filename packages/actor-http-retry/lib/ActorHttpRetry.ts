import type { IActionHttp, IActorHttpOutput, IActorHttpArgs, MediatorHttp } from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import { KeysHttp } from '@comunica/context-entries';
import { ActionContextKey, passTest, failTest } from '@comunica/core';
import type { TestResult } from '@comunica/core';
import type { IMediatorTypeTime } from '@comunica/mediatortype-time';

export class ActorHttpRetry extends ActorHttp {
  private readonly mediatorHttp: MediatorHttp;
  private readonly activeDelays: Record<string, { date: Date; timeout: NodeJS.Timeout }>;

  // Expression that matches dates expressed in the HTTP Date header format
  // eslint-disable-next-line max-len
  private static readonly dateRegex = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), [0-9]{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) [0-9]{4} [0-9]{2}:[0-9]{2}:[0-9]{2} GMT$/u;
  private static readonly numberRegex = /^[0-9]+$/u;
  private static readonly keyWrapped = new ActionContextKey<boolean>('urn:comunica:actor-http-retry#wrapped');

  public constructor(args: IActorHttpQueueArgs) {
    super(args);
    this.mediatorHttp = args.mediatorHttp;
    this.activeDelays = {};
  }

  public async test(action: IActionHttp): Promise<TestResult<IMediatorTypeTime>> {
    if (action.context.has(ActorHttpRetry.keyWrapped)) {
      return failTest(`${this.name} can only wrap a request once`);
    }
    const retryCount = action.context.get<number>(KeysHttp.httpRetryCount);
    if (!retryCount || retryCount < 1) {
      return failTest(`${this.name} requires a retry count greater than zero to function`);
    }
    return passTest({ time: 0 });
  }

  public async run(action: IActionHttp): Promise<IActorHttpOutput> {
    const url = ActorHttp.getInputUrl(action.input);

    // Attempt once + the number of retries specified by the user
    const attemptLimit = action.context.getSafe<number>(KeysHttp.httpRetryCount) + 1;
    const retryDelay = action.context.get<number>(KeysHttp.httpRetryDelay) ?? 0;
    const retryStatusCodes = action.context.get<number[]>(KeysHttp.httpRetryStatusCodes);

    // This is declared outside the loop so it can be used for the final error message
    for (let attempt = 1; attempt <= attemptLimit; attempt++) {
      if (url.host in this.activeDelays) {
        this.logDebug(action.context, 'Delaying request due to host rate limit', () => ({
          url: url.href,
          delayedUntil: this.activeDelays[url.host].date.toISOString(),
          currentAttempt: `${attempt} / ${attemptLimit}`,
        }));
        await ActorHttpRetry.waitUntil(this.activeDelays[url.host].date);
      } else if (attempt > 1) {
        await ActorHttpRetry.waitUntil(new Date(Date.now() + retryDelay));
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

      if (response.status === 429 || response.status === 503) {
        // When the server reports a rate limit or temporary unavailability,
        // then wait for the amount of time or for the specific date/time specified in Retry-After,
        // or wait for the default user-specified time if this header is not provided by the server
        const retryAfter = ActorHttpRetry.parseRetryAfterHeader(
          response.headers.get('retry-after') ?? retryDelay.toString(10),
        );

        // Clear any previous clean-up timers for the host, since the delay has been renewed
        if (url.host in this.activeDelays) {
          clearTimeout(this.activeDelays[url.host].timeout);
        }

        // Record the current host-specific active delay, and add a clean-up timer for this new delay
        this.activeDelays[url.host] = {
          date: retryAfter,
          timeout: setTimeout(() => delete this.activeDelays[url.host], Date.now() - retryAfter.getTime()),
        };

        this.logDebug(action.context, 'Detected server-side rate limit', () => ({
          url: url.href,
          status: response.status,
          statusText: response.statusText,
          retryAfter: retryAfter.toISOString(),
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

  public static async waitUntil(date: Date): Promise<void> {
    const delay = date.getTime() - Date.now();
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  public static parseRetryAfterHeader(retryAfter: string): Date {
    if (ActorHttpRetry.numberRegex.test(retryAfter)) {
      return new Date(Date.now() + Number.parseInt(retryAfter, 10) * 1_000);
    }
    if (ActorHttpRetry.dateRegex.test(retryAfter)) {
      return new Date(retryAfter);
    }
    throw new Error(`Invalid Retry-After header: ${retryAfter}`);
  }
}

export interface IActorHttpQueueArgs extends IActorHttpArgs {
  /**
   * The HTTP mediator.
   */
  mediatorHttp: MediatorHttp;
}
