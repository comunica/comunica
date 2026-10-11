import type { MediatorHttp } from '@comunica/bus-http';
import type { IActionHttpInvalidate } from '@comunica/bus-http-invalidate';
import { ActionContext, Bus } from '@comunica/core';
import { ActorHttpLimitRate } from '../lib/ActorHttpLimitRate';
import '@comunica/utils-jest';

describe('ActorHttpLimitRate', () => {
  let bus: any;
  let actor: ActorHttpLimitRate;
  let mediatorHttp: MediatorHttp;
  let actorHostData: Map<string, {
    requestInterval: number;
    latestRequestTimestamp: number;
    rateLimited: boolean;
    concurrency: number;
    successStreak: number;
  }>;
  let invalidateListeners: ((event: IActionHttpInvalidate) => void)[];

  const correctionMultiplier = 0.1;
  const failureMultiplier = 10;
  const recoveryThreshold = 50;

  const url = 'http://localhost:3000/some/url';
  const host = 'localhost:3000';

  beforeEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    bus = new Bus({ name: 'bus' });
    invalidateListeners = [];
    mediatorHttp = <any>{
      mediate: jest.fn().mockRejectedValue(new Error('mediatorHttp.mediate')),
    };
    actor = new ActorHttpLimitRate({
      bus,
      correctionMultiplier,
      failureMultiplier,
      limitByDefault: false,
      allowOverlap: false,
      recoveryThreshold,
      httpInvalidator: <any>{
        addInvalidateListener: jest.fn(listener => invalidateListeners.push(listener)),
      },
      mediatorHttp,
      name: 'actor',
    });
    actorHostData = (<any>actor).hostData;
    jest.spyOn((<any>actor), 'logDebug').mockImplementation((...args) => (<() => unknown>args[2])());
  });

  describe('test', () => {
    it('should wrap operation', async() => {
      const context = new ActionContext({});
      await expect(actor.test({ context, input: url })).resolves.toPassTest({ time: 0 });
    });

    it('should wrap operation only once', async() => {
      const context = new ActionContext({});
      await expect(actor.test({
        context: context.set((<any>ActorHttpLimitRate).keyWrapped, true),
        input: url,
      })).resolves.toFailTest(`${actor.name} can only wrap a request once`);
    });
  });

  describe('run', () => {
    it('should handle successful requests', async() => {
      const response = { ok: true };
      const duration = 100;
      jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(duration);
      jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(<any>response);
      jest.spyOn(globalThis, 'setTimeout').mockImplementation(<any> ((callback: any) => callback()));
      const action = { context: new ActionContext({}), input: url };
      expect(actorHostData.has(host)).toBeFalsy();
      await expect(actor.run(action)).resolves.toEqual(response);
      expect(globalThis.setTimeout).not.toHaveBeenCalled();
      expect(actorHostData.get(host)).toEqual({
        requestInterval: duration * correctionMultiplier,
        latestRequestTimestamp: 0,
        rateLimited: false,
        concurrency: 1,
        successStreak: 0,
      });
    });

    it('should delay requests when host is rate limited', async() => {
      const response = { ok: true };
      const interval = 100;
      const responseTime = 200;
      jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(responseTime);
      jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(<any>response);
      jest.spyOn(globalThis, 'setTimeout').mockImplementation(<any> ((callback: any) => callback()));
      actorHostData.set(host, {
        latestRequestTimestamp: 0,
        rateLimited: true,
        requestInterval: interval,
        concurrency: 1,
        successStreak: 0,
      });
      const action = { context: new ActionContext({}), input: url };
      await expect(actor.run(action)).resolves.toEqual(response);
      expect(globalThis.setTimeout).toHaveBeenCalledTimes(1);
      expect(globalThis.setTimeout).toHaveBeenNthCalledWith(1, expect.any(Function), interval);
      expect(actorHostData.get(host)).toEqual({
        requestInterval: interval + correctionMultiplier * (responseTime - interval - interval),
        latestRequestTimestamp: interval,
        rateLimited: true,
        concurrency: 2,
        successStreak: 1,
      });
    });

    it('should delay requests when host is rate limited and overlap is allowed', async() => {
      const response = { ok: true };
      const interval = 100;
      const responseTime = 200;
      (<any>actor).allowOverlap = true;
      jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(responseTime);
      jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(<any>response);
      jest.spyOn(globalThis, 'setTimeout').mockImplementation(<any> ((callback: any) => callback()));
      actorHostData.set(host, {
        latestRequestTimestamp: 0,
        rateLimited: true,
        requestInterval: interval,
        concurrency: 1,
        successStreak: 0,
      });
      const action = { context: new ActionContext({}), input: url };
      await expect(actor.run(action)).resolves.toEqual(response);
      expect(globalThis.setTimeout).toHaveBeenCalledTimes(1);
      expect(globalThis.setTimeout).toHaveBeenNthCalledWith(1, expect.any(Function), interval);
      expect(actorHostData.get(host)).toEqual({
        requestInterval: interval + correctionMultiplier * (responseTime - interval - interval),
        // Note: the timestamp should be 0 because the interval is not applied!
        // This is the major difference between the overlap and non-overlap test
        latestRequestTimestamp: 0,
        rateLimited: true,
        concurrency: 2,
        successStreak: 1,
      });
    });

    it('should delay requests by default when configured to', async() => {
      const duration1 = 100;
      const duration2 = 200;
      const interval1 = duration1 * correctionMultiplier;
      // After the first success, two requests may be sent per interval
      const delay2 = interval1 / 2;
      const interval2 = interval1 + Math.round(correctionMultiplier * (duration2 - delay2 - interval1));
      const response = { ok: true };
      (<any>actor).limitByDefault = true;
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(0).mockReturnValueOnce(duration1)
        .mockReturnValueOnce(0).mockReturnValueOnce(duration2);
      jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(<any>response);
      jest.spyOn(globalThis, 'setTimeout').mockImplementation(<any> ((callback: any) => callback()));
      const action = { context: new ActionContext({}), input: url };
      expect(actorHostData.has(host)).toBeFalsy();
      // First call, when the duration is assigned as the delay
      await expect(actor.run(action)).resolves.toEqual(response);
      expect(globalThis.setTimeout).not.toHaveBeenCalled();
      expect(actorHostData.get(host)).toEqual({
        requestInterval: interval1,
        latestRequestTimestamp: 0,
        rateLimited: true,
        concurrency: 2,
        successStreak: 1,
      });
      // Second call, when the delay is adjusted based on the correction multiplier
      await expect(actor.run(action)).resolves.toEqual(response);
      expect(globalThis.setTimeout).toHaveBeenCalledTimes(1);
      expect(globalThis.setTimeout).toHaveBeenNthCalledWith(1, expect.any(Function), delay2);
      expect(actorHostData.get(host)).toEqual({
        requestInterval: interval2,
        latestRequestTimestamp: delay2,
        rateLimited: true,
        concurrency: 2.5,
        successStreak: 2,
      });
    });

    it.each([ 429, 503 ])('should handle overloaded requests with status %s', async(status) => {
      const duration1 = 400;
      const duration2 = 600;
      const interval1 = duration1 * failureMultiplier * correctionMultiplier;
      const interval2 = interval1 + correctionMultiplier * (failureMultiplier * (duration2 - interval1) - interval1);
      const response = { ok: false, status };
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(0).mockReturnValueOnce(duration1)
        .mockReturnValueOnce(0).mockReturnValueOnce(duration2);
      jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(<any>response);
      jest.spyOn(globalThis, 'setTimeout').mockImplementation(<any> ((callback: any) => callback()));
      const action = { context: new ActionContext({}), input: url };
      expect(actorHostData.has(host)).toBeFalsy();
      // First call, when the duration is assigned as the delay
      await expect(actor.run(action)).resolves.toEqual(response);
      expect(globalThis.setTimeout).not.toHaveBeenCalled();
      expect(actorHostData.get(host)).toEqual({
        requestInterval: interval1,
        latestRequestTimestamp: 0,
        rateLimited: true,
        concurrency: 1,
        successStreak: 0,
      });
      // Second call, when the delay is adjusted based on the correction multiplier
      await expect(actor.run(action)).resolves.toEqual(response);
      expect(globalThis.setTimeout).toHaveBeenCalledTimes(1);
      expect(globalThis.setTimeout).toHaveBeenNthCalledWith(1, expect.any(Function), interval1);
      expect(actorHostData.get(host)).toEqual({
        requestInterval: interval2,
        latestRequestTimestamp: interval1,
        rateLimited: true,
        concurrency: 1,
        successStreak: 0,
      });
    });

    it('should forward mediator errors', async() => {
      const errorMessage = 'HTTP error';
      jest.spyOn(Date, 'now').mockReturnValueOnce(0);
      jest.spyOn(Date, 'now').mockReturnValueOnce(100);
      jest.spyOn(mediatorHttp, 'mediate').mockRejectedValue(new Error(errorMessage));
      jest.spyOn(globalThis, 'setTimeout').mockImplementation(<any> ((callback: any) => callback()));
      const action = { context: new ActionContext({}), input: url };
      await expect(actor.run(action)).rejects.toThrow(errorMessage);
      expect(globalThis.setTimeout).not.toHaveBeenCalled();
    });

    it.each([ 'TimeoutError', 'AbortError' ])('should not mark hosts as rate-limited on a %s', async(name) => {
      const error = new Error('Aborted');
      error.name = name;
      jest.spyOn(mediatorHttp, 'mediate').mockRejectedValue(error);
      jest.spyOn(globalThis, 'setTimeout').mockImplementation(<any> ((callback: any) => callback()));
      const action = { context: new ActionContext({}), input: url };
      await expect(actor.run(action)).rejects.toThrow(error);
      expect(actorHostData.get(host)).toEqual({
        requestInterval: Number.NEGATIVE_INFINITY,
        latestRequestTimestamp: expect.any(Number),
        rateLimited: false,
        concurrency: 1,
        successStreak: 0,
      });
    });

    it('should not consider non-errors as client aborts', () => {
      expect(ActorHttpLimitRate.isClientAbort({ name: 'TimeoutError' })).toBeFalsy();
    });

    it.each([ 400, 403, 404, 500 ])('should not mark hosts as rate-limited on status %s', async(status) => {
      const response = { ok: false, status };
      jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(<any>response);
      jest.spyOn(globalThis, 'setTimeout').mockImplementation(<any> ((callback: any) => callback()));
      const action = { context: new ActionContext({}), input: url };
      expect(actorHostData.has(host)).toBeFalsy();
      await expect(actor.run(action)).resolves.toEqual(response);
      expect(globalThis.setTimeout).not.toHaveBeenCalled();
      expect(actorHostData.get(host)).toEqual({
        requestInterval: expect.anything(),
        latestRequestTimestamp: expect.anything(),
        rateLimited: false,
        concurrency: 1,
        successStreak: 0,
      });
    });

    it('should mark hosts as rate-limited on network errors', async() => {
      jest.spyOn(mediatorHttp, 'mediate').mockRejectedValue(new Error('fetch failed'));
      jest.spyOn(globalThis, 'setTimeout').mockImplementation(<any> ((callback: any) => callback()));
      const action = { context: new ActionContext({}), input: url };
      await expect(actor.run(action)).rejects.toThrow('fetch failed');
      expect(actorHostData.get(host)?.rateLimited).toBeTruthy();
    });
    it('should halve the concurrency on overload, down to one', async() => {
      jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(<any>{ ok: false, status: 429 });
      jest.spyOn(globalThis, 'setTimeout').mockImplementation(<any> ((callback: any) => callback()));
      actorHostData.set(host, {
        latestRequestTimestamp: 0,
        rateLimited: true,
        requestInterval: 100,
        concurrency: 5,
        successStreak: 3,
      });
      const action = { context: new ActionContext({}), input: url };
      await actor.run(action);
      expect(actorHostData.get(host)).toMatchObject({ concurrency: 2.5, successStreak: 0 });
      await actor.run(action);
      await actor.run(action);
      expect(actorHostData.get(host)).toMatchObject({ concurrency: 1, successStreak: 0 });
    });

    it('should recover hosts after enough consecutive successful requests', async() => {
      jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(<any>{ ok: true });
      jest.spyOn(globalThis, 'setTimeout').mockImplementation(<any> ((callback: any) => callback()));
      actorHostData.set(host, {
        latestRequestTimestamp: 0,
        rateLimited: true,
        requestInterval: 100,
        concurrency: 1,
        successStreak: recoveryThreshold - 2,
      });
      const action = { context: new ActionContext({}), input: url };
      await actor.run(action);
      expect(actorHostData.get(host)).toMatchObject({ rateLimited: true, successStreak: recoveryThreshold - 1 });
      await actor.run(action);
      expect(actorHostData.get(host)).toMatchObject({ rateLimited: false, concurrency: 1, successStreak: 0 });
    });

    it('should not recover hosts when limiting by default', async() => {
      (<any>actor).limitByDefault = true;
      jest.spyOn(mediatorHttp, 'mediate').mockResolvedValue(<any>{ ok: true });
      jest.spyOn(globalThis, 'setTimeout').mockImplementation(<any> ((callback: any) => callback()));
      actorHostData.set(host, {
        latestRequestTimestamp: 0,
        rateLimited: true,
        requestInterval: 100,
        concurrency: 1,
        successStreak: recoveryThreshold - 1,
      });
      const action = { context: new ActionContext({}), input: url };
      await actor.run(action);
      expect(actorHostData.get(host)).toMatchObject({ rateLimited: true, successStreak: recoveryThreshold });
    });
  });

  describe('handleHttpInvalidateEvent', () => {
    it.each([
      [ 'specific host data when specified', url, 1 ],
      [ 'all host data when not specified', undefined, 0 ],
    ])('correctly clears %s', async(_, url, expectedSize) => {
      actorHostData.set(host, {
        latestRequestTimestamp: 0,
        rateLimited: true,
        requestInterval: 0,
        concurrency: 1,
        successStreak: 0,
      });
      actorHostData.set('otherhost:3000', {
        latestRequestTimestamp: 0,
        rateLimited: true,
        requestInterval: 0,
        concurrency: 1,
        successStreak: 0,
      });
      expect(actorHostData.size).toBe(2);
      for (const listener of invalidateListeners) {
        listener({ context: <any>{}, url });
      }
      expect(actorHostData.size).toBe(expectedSize);
    });
  });
});
