import type { IActionHttp, IActorHttpOutput, ActorHttp, MediatorHttp } from '@comunica/bus-http';
import type { ActorHttpInvalidateListenable, IInvalidateListener } from '@comunica/bus-http-invalidate';
import { KeysHttp } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
import { Bus, ActionContext } from '@comunica/core';
import { ActorHttpRetry } from '../lib/ActorHttpRetry';
import '@comunica/utils-jest';

describe('ActorHttpRetry', () => {
  let bus: Bus<ActorHttp, IActionHttp, IActorTest, IActorHttpOutput>;
  let actor: ActorHttpRetry;
  let context: ActionContext;
  let mediatorHttp: MediatorHttp;
  let httpInvalidator: ActorHttpInvalidateListenable;
  let httpInvalidatorListener: IInvalidateListener;
  let input: string;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorHttp = <any> {
      mediate: jest.fn().mockRejectedValue(new Error('mediatorHttp.mediate called without mocking')),
    };
    httpInvalidator = <any>{
      addInvalidateListener: (listener: IInvalidateListener) => httpInvalidatorListener = listener,
    };
    input = 'http://127.0.0.1/abc';
    actor = new ActorHttpRetry({ bus, mediatorHttp, httpInvalidator, name: 'actor' });
    context = new ActionContext({ [KeysHttp.httpRetryCount.name]: 1 });
    jest.spyOn((<any>actor), 'logDebug').mockImplementation((...args) => (<() => unknown>args[2])());
    jest.spyOn((<any>actor), 'logWarn').mockImplementation((...args) => (<() => unknown>args[2])());
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('test', () => {
    it('should reject without retry count in the context', async() => {
      const context = new ActionContext();
      await expect(actor.test({ input, context })).resolves.toFailTest(`${actor.name} requires a retry count greater than zero to function`);
    });

    it('should reject with retry count below 1 in the context', async() => {
      const context = new ActionContext({ [KeysHttp.httpRetryCount.name]: 0 });
      await expect(actor.test({ input, context })).resolves.toFailTest(`${actor.name} requires a retry count greater than zero to function`);
    });

    it('should reject when the action has already been wrapped by it once', async() => {
      const context = new ActionContext({ [(<any>ActorHttpRetry).keyWrapped.name]: true });
      await expect(actor.test({ input, context })).resolves.toFailTest(`${actor.name} can only wrap a request once`);
    });

    it('should accept when retry count is provided in the context', async() => {
      const context = new ActionContext({ [KeysHttp.httpRetryCount.name]: 1 });
      await expect(actor.test({ input, context })).resolves.toPassTest({ time: 0 });
    });
  });

  describe('run', () => {
    beforeEach(() => {
      jest.spyOn(ActorHttpRetry, 'sleep').mockResolvedValue();
      jest.spyOn(ActorHttpRetry, 'parseRetryAfterHeader').mockReturnValue(new Date(0));
    });

    it('should handle an immediately successful request', async() => {
      const response: Response = <any> { ok: true };
      jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(response);
      expect(ActorHttpRetry.sleep).not.toHaveBeenCalled();
      expect(mediatorHttp.mediate).not.toHaveBeenCalled();
      await expect(actor.run({ input, context })).resolves.toEqual(response);
      expect(ActorHttpRetry.sleep).not.toHaveBeenCalled();
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(1);
    });

    it('should handle request that succeeds after retries', async() => {
      const mediatorResponseQueue: IActorHttpOutput[] = [
        <any> { ok: false, status: 999, statusText: 'Dummy Failure', headers: new Map() },
        <any> { ok: false, status: 504, statusText: 'Gateway Timeout', headers: new Map() },
        <any> { ok: true },
      ];
      // eslint-disable-next-line jest/prefer-mock-promise-shorthand
      jest.spyOn(mediatorHttp, 'mediate').mockImplementation(() => Promise.resolve(mediatorResponseQueue.shift()!));
      expect(ActorHttpRetry.sleep).not.toHaveBeenCalled();
      expect(ActorHttpRetry.parseRetryAfterHeader).not.toHaveBeenCalled();
      expect(mediatorHttp.mediate).not.toHaveBeenCalled();
      await expect(actor.run({
        input,
        context: context.set(KeysHttp.httpRetryCount, 2),
      })).resolves.toEqual({ ok: true });
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(3);
      expect(ActorHttpRetry.sleep).not.toHaveBeenCalled();
      expect(ActorHttpRetry.parseRetryAfterHeader).not.toHaveBeenCalled();
    });

    it('should handle error codes in the 400 range', async() => {
      const response: Response = <any> { ok: false, status: 400, headers: new Map() };
      jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(response);
      expect(ActorHttpRetry.sleep).not.toHaveBeenCalled();
      expect(ActorHttpRetry.parseRetryAfterHeader).not.toHaveBeenCalled();
      expect(mediatorHttp.mediate).not.toHaveBeenCalled();
      await expect(actor.run({ input, context })).rejects.toThrow(`Request failed: ${input}`);
      expect(ActorHttpRetry.sleep).not.toHaveBeenCalled();
      expect(ActorHttpRetry.parseRetryAfterHeader).not.toHaveBeenCalled();
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(1);
    });

    it('should handle error codes in the 500 range', async() => {
      const response: Response = <any> { ok: false, status: 500, headers: new Map() };
      jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(response);
      expect(ActorHttpRetry.sleep).not.toHaveBeenCalled();
      expect(ActorHttpRetry.parseRetryAfterHeader).not.toHaveBeenCalled();
      expect(mediatorHttp.mediate).not.toHaveBeenCalled();
      await expect(actor.run({ input, context })).rejects.toThrow(`Request failed: ${input}`);
      expect(ActorHttpRetry.sleep).not.toHaveBeenCalled();
      expect(ActorHttpRetry.parseRetryAfterHeader).not.toHaveBeenCalled();
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(1);
    });

    it('should handle error codes in force retry list', async() => {
      const response: Response = <any> { ok: false, status: 500, headers: new Map() };
      jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(response);
      expect(ActorHttpRetry.sleep).not.toHaveBeenCalled();
      expect(ActorHttpRetry.parseRetryAfterHeader).not.toHaveBeenCalled();
      expect(mediatorHttp.mediate).not.toHaveBeenCalled();
      await expect(actor.run({
        input,
        context: context.set(KeysHttp.httpRetryStatusCodes, [ 500 ]),
      })).rejects.toThrow(`Request failed: ${input}`);
      expect(ActorHttpRetry.sleep).not.toHaveBeenCalled();
      expect(ActorHttpRetry.parseRetryAfterHeader).not.toHaveBeenCalled();
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(2);
    });

    it.each([
      405,
      429,
      503,
    ])('should handle server-side delay requests via Retry-After header with status code %d', async(status) => {
      const retryAfterDate = new Date(1_000);
      const response: Response = <any> {
        ok: false,
        status,
        headers: new Headers({ 'retry-after': retryAfterDate.getTime().toString(10) }),
      };
      jest.spyOn(Date, 'now').mockReturnValue(0);
      jest.spyOn(ActorHttpRetry, 'parseRetryAfterHeader').mockReturnValue(retryAfterDate);
      jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(response);
      expect(mediatorHttp.mediate).not.toHaveBeenCalled();
      expect(ActorHttpRetry.sleep).not.toHaveBeenCalled();
      expect(ActorHttpRetry.parseRetryAfterHeader).not.toHaveBeenCalled();
      await expect(actor.run({ input, context })).rejects.toThrow(`Request failed: ${input}`);
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(2);
      expect(ActorHttpRetry.sleep).toHaveBeenCalledTimes(1);
      expect(ActorHttpRetry.sleep).toHaveBeenNthCalledWith(1, retryAfterDate.getTime());
      expect(ActorHttpRetry.parseRetryAfterHeader).toHaveBeenCalledTimes(2);
      expect(ActorHttpRetry.parseRetryAfterHeader).toHaveBeenNthCalledWith(1, response.headers.get('retry-after'));
      expect(ActorHttpRetry.parseRetryAfterHeader).toHaveBeenNthCalledWith(2, response.headers.get('retry-after'));
    });

    it('should handle server-side delay requests via Retry-After header above the limit', async() => {
      const retryAfterLimit = 1_000;
      const retryAfterDate = new Date(retryAfterLimit * 2);
      const response: Response = <any> {
        ok: false,
        status: 429,
        headers: new Headers({ 'retry-after': retryAfterDate.getTime().toString(10) }),
      };
      jest.spyOn(Date, 'now').mockReturnValue(0);
      jest.spyOn(ActorHttpRetry, 'parseRetryAfterHeader').mockReturnValue(retryAfterDate);
      jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(response);
      jest.spyOn(globalThis, 'setTimeout').mockImplementation(callback => <any> callback());
      expect(mediatorHttp.mediate).not.toHaveBeenCalled();
      expect(ActorHttpRetry.sleep).not.toHaveBeenCalled();
      expect(ActorHttpRetry.parseRetryAfterHeader).not.toHaveBeenCalled();
      await expect(actor.run({ input, context: context.set(KeysHttp.httpRetryDelayLimit, retryAfterLimit) })).rejects.toThrow(`Request failed: ${input}`);
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(1);
      expect(ActorHttpRetry.sleep).not.toHaveBeenCalled();
      expect(ActorHttpRetry.parseRetryAfterHeader).toHaveBeenCalledTimes(1);
      expect(ActorHttpRetry.parseRetryAfterHeader).toHaveBeenNthCalledWith(1, response.headers.get('retry-after'));
    });

    it('should handle server-side unavailability with invalid Retry-After header', async() => {
      const response: Response = <any> {
        ok: false,
        status: 429,
        headers: new Headers({ 'retry-after': 'a b c' }),
      };
      jest.spyOn(Date, 'now').mockReturnValue(0);
      jest.spyOn(ActorHttpRetry, 'parseRetryAfterHeader').mockReturnValue(undefined);
      jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(response);
      expect(mediatorHttp.mediate).not.toHaveBeenCalled();
      expect(ActorHttpRetry.sleep).not.toHaveBeenCalled();
      expect(ActorHttpRetry.parseRetryAfterHeader).not.toHaveBeenCalled();
      await expect(actor.run({ input, context })).rejects.toThrow(`Request failed: ${input}`);
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(2);
      expect(ActorHttpRetry.sleep).not.toHaveBeenCalled();
      expect(ActorHttpRetry.parseRetryAfterHeader).toHaveBeenCalledTimes(2);
      expect(ActorHttpRetry.parseRetryAfterHeader).toHaveBeenNthCalledWith(1, response.headers.get('retry-after'));
      expect(ActorHttpRetry.parseRetryAfterHeader).toHaveBeenNthCalledWith(2, response.headers.get('retry-after'));
    });

    it('should handle server-side unavailability without Retry-After header', async() => {
      const fallbackDelay = 100;
      const response: Response = <any> {
        ok: false,
        status: 429,
        headers: new Headers(),
      };
      jest.spyOn(Date, 'now').mockReturnValue(0);
      jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(response);
      expect(mediatorHttp.mediate).not.toHaveBeenCalled();
      expect(ActorHttpRetry.sleep).not.toHaveBeenCalled();
      expect(ActorHttpRetry.parseRetryAfterHeader).not.toHaveBeenCalled();
      await expect(actor.run({ input, context: context.set(KeysHttp.httpRetryDelayFallback, fallbackDelay) })).rejects.toThrow(`Request failed: ${input}`);
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(2);
      expect(ActorHttpRetry.sleep).toHaveBeenCalledTimes(1);
      expect(ActorHttpRetry.sleep).toHaveBeenNthCalledWith(1, fallbackDelay);
      expect(ActorHttpRetry.parseRetryAfterHeader).not.toHaveBeenCalled();
    });

    it('should propagate errors from the mediator', async() => {
      const error = new Error('mediator error');
      jest.spyOn(mediatorHttp, 'mediate').mockRejectedValue(error);
      await expect(actor.run({ input, context })).rejects.toThrow(error);
    });
  });

  describe('sleep', () => {
    beforeEach(() => {
      jest.spyOn(globalThis, 'setTimeout').mockImplementation(callback => <any> callback());
    });

    it('should sleep the specified amount of milliseconds', async() => {
      const ms = 100;
      expect(setTimeout).not.toHaveBeenCalled();
      await ActorHttpRetry.sleep(ms);
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(setTimeout).toHaveBeenNthCalledWith(1, expect.any(Function), ms);
    });

    it('should return immediately when called with 0', async() => {
      expect(setTimeout).not.toHaveBeenCalled();
      await ActorHttpRetry.sleep(0);
      expect(setTimeout).not.toHaveBeenCalled();
    });

    it('should return immediately when called with values below 0', async() => {
      expect(setTimeout).not.toHaveBeenCalled();
      await ActorHttpRetry.sleep(-10);
      expect(setTimeout).not.toHaveBeenCalled();
    });
  });

  describe('parseRetryAfterHeader', () => {
    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(0);
    });

    it('should parse integer header', () => {
      expect(Date.now).not.toHaveBeenCalled();
      expect(ActorHttpRetry.parseRetryAfterHeader('1')).toEqual(new Date(1_000));
      expect(Date.now).toHaveBeenCalledTimes(1);
    });

    it('should parse date string header', () => {
      expect(ActorHttpRetry.parseRetryAfterHeader('Thu, 01 Jan 1970 00:00:01 GMT')).toEqual(new Date(1_000));
    });

    it('should return undefined for invalid header values', () => {
      expect(ActorHttpRetry.parseRetryAfterHeader('a b c')).toBeUndefined();
    });
  });

  describe('handleHttpInvalidateEvent', () => {
    it('should get called by the invalidator', () => {
      jest.spyOn(actor, 'handleHttpInvalidateEvent').mockReturnValue();
      expect(actor.handleHttpInvalidateEvent).not.toHaveBeenCalled();
      httpInvalidatorListener({ context, url: undefined });
      expect(actor.handleHttpInvalidateEvent).toHaveBeenCalledTimes(1);
    });

    it('should clear all delays without URL', () => {
      const activeDelays = <Record<string, { timeout: NodeJS.Timeout }>>(<any>actor).activeDelays;
      activeDelays['example.org'] = { timeout: <any>undefined };
      activeDelays['example.com'] = { timeout: <any>undefined };
      actor.handleHttpInvalidateEvent({ context, url: undefined });
      expect(activeDelays).toStrictEqual({});
    });

    it('should clear only matching delays with URL', () => {
      const activeDelays = <Record<string, { timeout: NodeJS.Timeout }>>(<any>actor).activeDelays;
      activeDelays['example.org'] = { timeout: <any>undefined };
      activeDelays['example.com'] = { timeout: <any>undefined };
      actor.handleHttpInvalidateEvent({ context, url: 'http://example.org/abc' });
      expect(activeDelays).toStrictEqual({ 'example.com': { timeout: undefined }});
    });
  });
});
