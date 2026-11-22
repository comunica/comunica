import type { IActionHttp, IActorHttpOutput, IActorHttpArgs, MediatorHttp } from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import { KeysHttp } from '@comunica/context-entries';
import type { TestResult } from '@comunica/core';
import { ActionContextKey, failTest, passTest } from '@comunica/core';
import type { IMediatorTypeTime } from '@comunica/mediatortype-time';

/**
 * A comunica HTTP actor that limits the number of concurrent requests per host, once the host signals overload.
 *
 * Hosts differ widely in how many concurrent requests they handle well,
 * so requests are not limited, apart from `maxLimit`, until a host signals overload:
 * a status 429 or 503, or a failure without response, such as a lost connection.
 * The limit then becomes half the number of requests that were in flight, similar to TCP congestion control,
 * and grows by one per limit's worth of successful requests, up to `maxLimit`.
 *
 * A request takes up its slot until its response headers arrive, not until its body is read,
 * as consumers may only read a body after other requests to the same host completed.
 */
export class ActorHttpLimitConcurrency extends ActorHttp {
  private readonly mediatorHttp: MediatorHttp;
  public readonly maxLimit: number;
  private readonly hosts = new Map<string, IHostState>();

  // Context key to indicate that the actor has already wrapped the given request
  private static readonly keyWrapped =
    new ActionContextKey<boolean>('urn:comunica:actor-http-limit-concurrency#wrapped');

  public constructor(args: IActorHttpLimitConcurrencyArgs) {
    super(args);
    this.mediatorHttp = args.mediatorHttp;
    this.maxLimit = args.maxLimit;
  }

  public async test(action: IActionHttp): Promise<TestResult<IMediatorTypeTime>> {
    if (action.context.has(ActorHttpLimitConcurrency.keyWrapped)) {
      return failTest(`${this.name} can only wrap a request once`);
    }
    if (this.maxLimit < 1) {
      return failTest(`${this.name} requires a maximum limit of at least one`);
    }
    return passTest({ time: 0 });
  }

  public async run(action: IActionHttp): Promise<IActorHttpOutput> {
    const host = ActorHttp.getInputUrl(action.input).host;
    const state = this.getHostState(host);
    await this.acquire(state, action);
    const sentAt = performance.now();
    let response: IActorHttpOutput;
    try {
      response = await this.mediatorHttp.mediate({
        ...action,
        context: action.context.set(ActorHttpLimitConcurrency.keyWrapped, true),
      });
    } catch (error: unknown) {
      this.release(state, sentAt, !ActorHttpLimitConcurrency.isClientAbort(error));
      throw error;
    }
    this.release(state, sentAt, ActorHttpLimitConcurrency.isOverloadStatus(response.status));
    return response;
  }

  public getHostState(host: string): IHostState {
    let state = this.hosts.get(host);
    if (!state) {
      state = {
        limit: this.maxLimit,
        active: 0,
        queue: [],
        lastDecrease: Number.NEGATIVE_INFINITY,
      };
      this.hosts.set(host, state);
    }
    return state;
  }

  /**
   * Wait until the host has a free slot, and take it.
   * @param state The host state.
   * @param action The HTTP action, which may be aborted while waiting.
   */
  protected async acquire(state: IHostState, action: IActionHttp): Promise<void> {
    if (state.active < Math.floor(state.limit) && state.queue.length === 0) {
      state.active++;
      return;
    }
    const signals: AbortSignal[] = [];
    for (const signal of [ action.context.get(KeysHttp.httpAbortSignal), action.init?.signal ]) {
      if (signal) {
        signals.push(signal);
      }
    }
    await new Promise<void>((resolve, reject) => {
      const onAbort = (): void => {
        state.queue.splice(state.queue.indexOf(entry), 1);
        reject(signals.find(signal => signal.aborted)!.reason);
      };
      const entry = (): void => {
        for (const signal of signals) {
          signal.removeEventListener('abort', onAbort);
        }
        state.active++;
        resolve();
      };
      if (signals.some(signal => signal.aborted)) {
        return reject(signals.find(signal => signal.aborted)!.reason);
      }
      for (const signal of signals) {
        signal.addEventListener('abort', onAbort, { once: true });
      }
      state.queue.push(entry);
    });
  }

  /**
   * Give up a slot, adapt the limit, and let waiting requests take free slots.
   * @param state The host state.
   * @param sentAt When the request was sent.
   * @param overload If the host signalled overload.
   */
  protected release(state: IHostState, sentAt: number, overload: boolean): void {
    const inFlight = state.active;
    state.active--;
    if (overload) {
      // Requests that were sent before the previous decrease already count towards it.
      if (sentAt > state.lastDecrease) {
        state.limit = Math.max(1, Math.min(state.limit, inFlight) / 2);
        state.lastDecrease = performance.now();
      }
    } else if (state.limit < this.maxLimit) {
      state.limit = Math.min(this.maxLimit, state.limit + 1 / state.limit);
    }
    while (state.queue.length > 0 && state.active < Math.floor(state.limit)) {
      state.queue.shift()!();
    }
  }

  /**
   * Check if the given HTTP status code indicates that the server is overloaded.
   * @param status An HTTP status code.
   */
  public static isOverloadStatus(status: number): boolean {
    return status === 429 || status === 503;
  }

  /**
   * Check if the given error was caused by the client timing out or aborting the request.
   * @param error An error.
   */
  public static isClientAbort(error: unknown): boolean {
    return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
  }
}

export interface IHostState {
  /**
   * The current limit of concurrent requests, of which the floor is used.
   */
  limit: number;
  /**
   * The number of requests in flight.
   */
  active: number;
  /**
   * Requests that wait for a free slot.
   */
  queue: (() => void)[];
  /**
   * When the limit was last decreased.
   */
  lastDecrease: number;
}

export interface IActorHttpLimitConcurrencyArgs extends IActorHttpArgs {
  /**
   * The HTTP mediator.
   */
  mediatorHttp: MediatorHttp;
  /**
   * The maximum number of concurrent requests per host.
   * @range {integer}
   * @default {10000}
   */
  maxLimit: number;
}
