import type { IActionHttp, IActorHttpOutput, ActorHttp, MediatorHttp } from '@comunica/bus-http';
import { KeysHttp } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
import { Bus, ActionContext } from '@comunica/core';
import { ActorHttpRetry } from '../lib/ActorHttpRetry';
import '@comunica/jest';

describe('ActorHttpRetry', () => {
  let bus: Bus<ActorHttp, IActionHttp, IActorTest, IActorHttpOutput>;
  let actor: ActorHttpRetry;
  let context: ActionContext;
  let mediatorHttp: MediatorHttp;
  let input: string;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorHttp = <any> {
      mediate: jest.fn().mockRejectedValue(new Error('mediatorHttp.mediate called without mocking')),
    };
    input = 'http://example.org/abc';
    actor = new ActorHttpRetry({ bus, mediatorHttp, name: 'actor' });
    context = new ActionContext({ [KeysHttp.httpRetryCount.name]: 1 });
    jest.spyOn((<any>actor), 'logDebug').mockImplementation((...args) => (<() => unknown>args[2])());
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
      jest.spyOn(ActorHttpRetry, 'waitUntil').mockResolvedValue();
      jest.spyOn(ActorHttpRetry, 'parseRetryAfterHeader').mockReturnValue(new Date(0));
    });

    it('should handle an immediately successful request', async() => {
      const response: Response = <any> { ok: true };
      jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(response);
      expect(ActorHttpRetry.waitUntil).not.toHaveBeenCalled();
      expect(ActorHttpRetry.parseRetryAfterHeader).not.toHaveBeenCalled();
      expect(mediatorHttp.mediate).not.toHaveBeenCalled();
      await expect(actor.run({ input, context })).resolves.toEqual(response);
      expect(ActorHttpRetry.waitUntil).not.toHaveBeenCalled();
      expect(ActorHttpRetry.parseRetryAfterHeader).not.toHaveBeenCalled();
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(1);
    });

    it('should handle request that succeeds after retries', async() => {
      const mediatorResponseQueue: IActorHttpOutput[] = [
        <any> { ok: false, status: 999, statusText: 'Dummy Failure' },
        <any> { ok: false, status: 504, statusText: 'Gateway Timeout' },
        <any> { ok: true },
      ];
      // eslint-disable-next-line jest/prefer-mock-promise-shorthand
      jest.spyOn(mediatorHttp, 'mediate').mockImplementation(() => Promise.resolve(mediatorResponseQueue.shift()!));
      expect(ActorHttpRetry.waitUntil).not.toHaveBeenCalled();
      expect(ActorHttpRetry.parseRetryAfterHeader).not.toHaveBeenCalled();
      expect(mediatorHttp.mediate).not.toHaveBeenCalled();
      await expect(actor.run({
        input,
        context: context.set(KeysHttp.httpRetryCount, 2),
      })).resolves.toEqual({ ok: true });
      expect(ActorHttpRetry.waitUntil).toHaveBeenCalledTimes(2);
      expect(ActorHttpRetry.parseRetryAfterHeader).not.toHaveBeenCalled();
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(3);
    });

    it('should handle error codes in the 400 range', async() => {
      const response: Response = <any> { ok: false, status: 400 };
      jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(response);
      expect(ActorHttpRetry.waitUntil).not.toHaveBeenCalled();
      expect(ActorHttpRetry.parseRetryAfterHeader).not.toHaveBeenCalled();
      expect(mediatorHttp.mediate).not.toHaveBeenCalled();
      await expect(actor.run({ input, context })).rejects.toThrow(`Request failed: ${input}`);
      expect(ActorHttpRetry.waitUntil).not.toHaveBeenCalled();
      expect(ActorHttpRetry.parseRetryAfterHeader).not.toHaveBeenCalled();
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(1);
    });

    it('should handle error codes in the 500 range', async() => {
      const response: Response = <any> { ok: false, status: 500 };
      jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(response);
      expect(ActorHttpRetry.waitUntil).not.toHaveBeenCalled();
      expect(ActorHttpRetry.parseRetryAfterHeader).not.toHaveBeenCalled();
      expect(mediatorHttp.mediate).not.toHaveBeenCalled();
      await expect(actor.run({ input, context })).rejects.toThrow(`Request failed: ${input}`);
      expect(ActorHttpRetry.waitUntil).not.toHaveBeenCalled();
      expect(ActorHttpRetry.parseRetryAfterHeader).not.toHaveBeenCalled();
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(1);
    });

    it('should handle error codes in force retry list', async() => {
      const response: Response = <any> { ok: false, status: 500 };
      jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(response);
      expect(ActorHttpRetry.waitUntil).not.toHaveBeenCalled();
      expect(ActorHttpRetry.parseRetryAfterHeader).not.toHaveBeenCalled();
      expect(mediatorHttp.mediate).not.toHaveBeenCalled();
      await expect(actor.run({
        input,
        context: context.set(KeysHttp.httpRetryStatusCodes, [ 500 ]),
      })).rejects.toThrow(`Request failed: ${input}`);
      expect(ActorHttpRetry.waitUntil).toHaveBeenCalledTimes(1);
      expect(ActorHttpRetry.parseRetryAfterHeader).not.toHaveBeenCalled();
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(2);
    });

    it('should handle server-side rate limiting with retry-after header', async() => {
      const retryAfterDate = new Date(1_000);
      jest.spyOn(Date, 'now').mockReturnValue(0);
      jest.spyOn(ActorHttpRetry, 'parseRetryAfterHeader').mockReturnValue(retryAfterDate);
      jest.spyOn(globalThis, 'setTimeout').mockImplementation(callback => <any>callback());
      const response: Response = <any> { ok: false, status: 429, headers: new Headers({ 'retry-after': '1000' }) };
      jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(response);
      expect(ActorHttpRetry.waitUntil).not.toHaveBeenCalled();
      expect(ActorHttpRetry.parseRetryAfterHeader).not.toHaveBeenCalled();
      expect(mediatorHttp.mediate).not.toHaveBeenCalled();
      await expect(actor.run({ input, context })).rejects.toThrow(`Request failed: ${input}`);
      expect(ActorHttpRetry.waitUntil).toHaveBeenCalledTimes(1);
      expect(ActorHttpRetry.waitUntil).toHaveBeenNthCalledWith(1, retryAfterDate);
      expect(ActorHttpRetry.parseRetryAfterHeader).toHaveBeenCalledTimes(2);
      expect(ActorHttpRetry.parseRetryAfterHeader).toHaveBeenNthCalledWith(1, '1000');
      expect(ActorHttpRetry.parseRetryAfterHeader).toHaveBeenNthCalledWith(2, '1000');
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(2);
    });

    it('should handle server-side rate limiting without retry-after header', async() => {
      const retryAfterDate = new Date(200);
      jest.spyOn(Date, 'now').mockReturnValue(0);
      jest.spyOn(ActorHttpRetry, 'parseRetryAfterHeader').mockReturnValue(retryAfterDate);
      jest.spyOn(globalThis, 'setTimeout').mockImplementation(callback => <any>callback());
      const response: Response = <any> { ok: false, status: 429, headers: new Headers() };
      jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(response);
      expect(ActorHttpRetry.waitUntil).not.toHaveBeenCalled();
      expect(ActorHttpRetry.parseRetryAfterHeader).not.toHaveBeenCalled();
      expect(mediatorHttp.mediate).not.toHaveBeenCalled();
      await expect(actor.run({
        input,
        context: context.set(KeysHttp.httpRetryDelay, 100),
      })).rejects.toThrow(`Request failed: ${input}`);
      expect(ActorHttpRetry.waitUntil).toHaveBeenCalledTimes(1);
      expect(ActorHttpRetry.waitUntil).toHaveBeenNthCalledWith(1, retryAfterDate);
      expect(ActorHttpRetry.parseRetryAfterHeader).toHaveBeenCalledTimes(2);
      expect(ActorHttpRetry.parseRetryAfterHeader).toHaveBeenNthCalledWith(1, '100');
      expect(ActorHttpRetry.parseRetryAfterHeader).toHaveBeenNthCalledWith(2, '100');
      expect(mediatorHttp.mediate).toHaveBeenCalledTimes(2);
    });

    it('should propagate errors from the mediator', async() => {
      const error = new Error('mediator error');
      jest.spyOn(mediatorHttp, 'mediate').mockRejectedValue(error);
      await expect(actor.run({ input, context })).rejects.toThrow(error);
    });
  });

  describe('waitUntil', () => {
    beforeEach(() => {
      jest.spyOn(globalThis, 'setTimeout').mockImplementation(callback => <any> callback());
    });

    it('should wait until the specified time', async() => {
      jest.spyOn(Date, 'now').mockReturnValue(0);
      expect(Date.now).not.toHaveBeenCalled();
      expect(setTimeout).not.toHaveBeenCalled();
      const waitTimeMilliseconds = 100;
      await ActorHttpRetry.waitUntil(new Date(waitTimeMilliseconds));
      expect(Date.now).toHaveBeenCalledTimes(1);
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(setTimeout).toHaveBeenNthCalledWith(1, expect.any(Function), waitTimeMilliseconds);
    });

    it('should return immediately if the time is in the past', async() => {
      jest.spyOn(Date, 'now').mockReturnValue(100);
      expect(Date.now).not.toHaveBeenCalled();
      expect(setTimeout).not.toHaveBeenCalled();
      await ActorHttpRetry.waitUntil(new Date(10));
      expect(Date.now).toHaveBeenCalledTimes(1);
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

    it('should reject invalid header value', () => {
      expect(() => ActorHttpRetry.parseRetryAfterHeader('a b c')).toThrow('Invalid Retry-After header: a b c');
    });
  });
});
