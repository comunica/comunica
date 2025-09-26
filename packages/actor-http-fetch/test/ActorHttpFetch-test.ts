import type { IActionHttp, IActorHttpOutput } from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import { KeysHttp } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { ActorHttpFetch } from '../lib/ActorHttpFetch';
import '@comunica/utils-jest';

jest.mock('../lib/FetchInitPreprocessor');

describe('ActorHttpFetch', () => {
  let bus: Bus<ActorHttp, IActionHttp, IActorTest, IActorHttpOutput>;
  let input: string;
  let actor: ActorHttpFetch;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    input = 'http://example.org/';
    context = new ActionContext();
    actor = new ActorHttpFetch({ name: 'actor', bus });
    jest.useFakeTimers();
    jest.spyOn(<any>actor, 'logInfo').mockImplementation((...args) => (<() => unknown>args[2])());
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should create new instances', () => {
      expect(actor).toBeInstanceOf(ActorHttpFetch);
      expect(actor).toBeInstanceOf(ActorHttp);
    });
  });

  describe('test', () => {
    it('should provide infinite time estimate', async() => {
      await expect(actor.test(<any>{})).resolves.toPassTest({ time: Number.POSITIVE_INFINITY });
    });
  });

  describe('run', () => {
    let headers: Headers;

    beforeEach(() => {
      headers = new Headers();
      jest.spyOn(actor, 'prepareRequestHeaders').mockReturnValue(headers);
      jest.spyOn(ActorHttp, 'headersToHash').mockReturnValue(<any>'headersDict');
      jest.replaceProperty(<any>actor, 'fetchInitPreprocessor', {
        handle: jest.fn().mockResolvedValue('requestInit'),
      });
    });

    it('should call fetch and return its output', async() => {
      const response = 'response';
      jest.spyOn(globalThis, 'fetch').mockResolvedValue(<any>response);
      await expect(actor.run({ input, context })).resolves.toBe(response);
      expect(actor.prepareRequestHeaders).toHaveBeenCalledTimes(1);
      expect(ActorHttp.headersToHash).toHaveBeenCalledTimes(1);
      expect((<any>actor).fetchInitPreprocessor.handle).toHaveBeenCalledTimes(1);
      expect((<any>actor).fetchInitPreprocessor.handle).toHaveBeenNthCalledWith(1, { method: 'GET', headers });
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(globalThis.fetch).toHaveBeenNthCalledWith(1, input, 'requestInit');
    });

    it('should call custom fetch and return its output', async() => {
      const response = 'custom fetch response';
      const customFetch = jest.fn().mockResolvedValue('custom fetch response');
      const contextWithFetch = context.set(KeysHttp.fetch, customFetch);
      jest.spyOn(globalThis, 'fetch').mockResolvedValue(<any>'default fetch response');
      await expect(actor.run({ input, context: contextWithFetch })).resolves.toBe(response);
      expect(actor.prepareRequestHeaders).toHaveBeenCalledTimes(1);
      // TODO: the headersToHash will no longer be called once the workaround in the actor is removed
      expect(ActorHttp.headersToHash).toHaveBeenCalledTimes(2);
      expect(ActorHttp.headersToHash).toHaveBeenNthCalledWith(1, headers);
      expect(ActorHttp.headersToHash).toHaveBeenNthCalledWith(2, headers);
      expect((<any>actor).fetchInitPreprocessor.handle).toHaveBeenCalledTimes(1);
      expect((<any>actor).fetchInitPreprocessor.handle).toHaveBeenNthCalledWith(1, {
        method: 'GET',
        headers: 'headersDict',
      });
      expect(globalThis.fetch).not.toHaveBeenCalled();
      expect(customFetch).toHaveBeenCalledTimes(1);
      expect(customFetch).toHaveBeenNthCalledWith(1, input, 'requestInit');
    });

    it('should handle included credentials', async() => {
      const response = 'response';
      const contextWithFlag = context.set(KeysHttp.includeCredentials, true);
      jest.spyOn(globalThis, 'fetch').mockResolvedValue(<any>response);
      await expect(actor.run({ input, context: contextWithFlag })).resolves.toBe(response);
      expect(actor.prepareRequestHeaders).toHaveBeenCalledTimes(1);
      expect(ActorHttp.headersToHash).toHaveBeenCalledTimes(1);
      expect((<any>actor).fetchInitPreprocessor.handle).toHaveBeenCalledTimes(1);
      expect((<any>actor).fetchInitPreprocessor.handle).toHaveBeenNthCalledWith(1, {
        method: 'GET',
        credentials: 'include',
        headers,
      });
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(globalThis.fetch).toHaveBeenNthCalledWith(1, input, 'requestInit');
    });

    it('should handle initial response timeout when it is reached', async() => {
      const timeoutMilliseconds = 10_000;
      const contextWithTimeout = context.set(KeysHttp.httpTimeout, timeoutMilliseconds);
      const expectedError = new Error(`Fetch timed out for ${input} after ${timeoutMilliseconds} ms`);
      // Mocks the fetch output to a promise that is never resolved, to mimick no reply from server,
      // and makes sure the promise is rejected on abort signal to simulate the fetch functionality
      jest.spyOn(globalThis, 'fetch').mockImplementation((_, init) => {
        return new Promise((_, reject) => init!.signal!.addEventListener('abort', () => reject(init!.signal!.reason)));
      });
      jest.spyOn(globalThis, 'setTimeout');
      jest.spyOn(globalThis, 'clearTimeout');
      jest.spyOn((<any>actor).fetchInitPreprocessor, 'handle').mockResolvedValue({});
      const errorHandler = jest.fn();
      const successHandler = jest.fn();
      actor.run({ input, context: contextWithTimeout }).then(successHandler).catch(errorHandler);
      await jest.runAllTimersAsync();
      expect(successHandler).not.toHaveBeenCalled();
      expect(errorHandler).toHaveBeenCalledTimes(1);
      expect(errorHandler).toHaveBeenNthCalledWith(1, expectedError);
      expect(globalThis.setTimeout).toHaveBeenCalledTimes(1);
      expect(globalThis.setTimeout).toHaveBeenNthCalledWith(1, expect.any(Function), timeoutMilliseconds);
      expect(globalThis.clearTimeout).not.toHaveBeenCalled();
    });

    it('should handle initial response timeout when it is not reached', async() => {
      const response = 'response';
      const timeoutMilliseconds = 10_000;
      const contextWithTimeout = context.set(KeysHttp.httpTimeout, timeoutMilliseconds);
      jest.spyOn(globalThis, 'fetch').mockResolvedValue(<any>response);
      jest.spyOn(globalThis, 'setTimeout');
      jest.spyOn(globalThis, 'clearTimeout');
      jest.spyOn((<any>actor).fetchInitPreprocessor, 'handle').mockResolvedValue({});
      await expect(actor.run({ input, context: contextWithTimeout })).resolves.toBe(response);
      expect(globalThis.setTimeout).toHaveBeenCalledTimes(1);
      expect(globalThis.setTimeout).toHaveBeenNthCalledWith(1, expect.any(Function), timeoutMilliseconds);
      expect(globalThis.clearTimeout).toHaveBeenCalledTimes(1);
    });

    it('should handle response body timeout when it is reached', async() => {
      const timeoutMilliseconds = 10_000;
      const contextWithTimeout = context
        .set(KeysHttp.httpTimeout, timeoutMilliseconds)
        .set(KeysHttp.httpBodyTimeout, true);
      const expectedError = new Error(`Fetch timed out for ${input} after ${timeoutMilliseconds} ms`);
      jest.spyOn(globalThis, 'fetch').mockImplementation((_, init) => {
        let bodyReadReject: Function;
        const body = new ReadableStream({
          pull: () => new Promise((_, reject) => {
            bodyReadReject = reject;
          }),
        });
        init!.signal!.addEventListener('abort', () => {
          const error = init!.signal!.reason;
          bodyReadReject(error);
        });
        return Promise.resolve(<any>{ body });
      });
      jest.spyOn(globalThis, 'setTimeout');
      jest.spyOn(globalThis, 'clearTimeout');
      jest.spyOn((<any>actor).fetchInitPreprocessor, 'handle').mockResolvedValue({});
      const response = await actor.run({ input, context: contextWithTimeout });
      const responseReader = response.body!.getReader();
      const errorHandler = jest.fn();
      const successHandler = jest.fn();
      responseReader.read().then(successHandler).catch(errorHandler);
      await jest.runAllTimersAsync();
      expect(successHandler).not.toHaveBeenCalled();
      expect(errorHandler).toHaveBeenCalledTimes(1);
      expect(errorHandler).toHaveBeenNthCalledWith(1, expectedError);
      expect(globalThis.setTimeout).toHaveBeenCalledTimes(1);
      expect(globalThis.setTimeout).toHaveBeenNthCalledWith(1, expect.any(Function), timeoutMilliseconds);
      expect(globalThis.clearTimeout).not.toHaveBeenCalled();
    });

    it('should handle response body timeout when it is not reached', async() => {
      const timeoutMilliseconds = 10_000;
      const contextWithTimeout = context
        .set(KeysHttp.httpTimeout, timeoutMilliseconds)
        .set(KeysHttp.httpBodyTimeout, true);
      jest.spyOn(globalThis, 'fetch').mockResolvedValue(<any>{
        body: new ReadableStream({
          pull: async(controller) => {
            controller.enqueue('abc');
            controller.close();
          },
        }),
      });
      jest.spyOn(globalThis, 'setTimeout');
      jest.spyOn(globalThis, 'clearTimeout');
      jest.spyOn((<any>actor).fetchInitPreprocessor, 'handle').mockResolvedValue({});
      const response = await actor.run({ input, context: contextWithTimeout });
      const responseReader = response.body!.getReader();
      await expect(responseReader.read()).resolves.toEqual({ done: false, value: 'abc' });
      expect(globalThis.setTimeout).toHaveBeenCalledTimes(1);
      expect(globalThis.setTimeout).toHaveBeenNthCalledWith(1, expect.any(Function), timeoutMilliseconds);
      expect(globalThis.clearTimeout).not.toHaveBeenCalled();
    });
  });

  describe('prepareRequestHeaders', () => {
    it('should assign user-agent header when none has been provided', () => {
      const userAgent = 'actor-determined agent';
      jest.spyOn(ActorHttp, 'isBrowser').mockReturnValue(false);
      jest.replaceProperty(<any>ActorHttpFetch, 'userAgent', userAgent);
      expect(globalThis.window).toBeUndefined();
      expect(actor.prepareRequestHeaders({ input, context }).get('user-agent')).toBe(userAgent);
    });

    it('should not re-assign user-agent header when one has been provided', () => {
      const userAgent = 'actor-determined agent';
      jest.spyOn(ActorHttp, 'isBrowser').mockReturnValue(false);
      jest.replaceProperty(<any>ActorHttpFetch, 'userAgent', userAgent);
      expect(globalThis.window).toBeUndefined();
      expect(actor.prepareRequestHeaders({ input, init: { headers: new Headers({ 'user-agent': 'UA' }) }, context })
        .get('user-agent')).toBe('UA');
    });

    it('should remove custom user-agent header in browser environments', () => {
      const init = { headers: { 'user-agent': 'custom agent' }};
      jest.spyOn(ActorHttp, 'isBrowser').mockReturnValue(true);
      expect(actor.prepareRequestHeaders({ input, context, init }).has('user-agent')).toBeFalsy();
      delete (<any>globalThis).window;
    });

    it('should add authorization header from context when provided', () => {
      const userAgent = 'actor-determined agent';
      const contextWithAuth = context.set(KeysHttp.auth, 'a');
      jest.spyOn(ActorHttp, 'isBrowser').mockReturnValue(false);
      jest.replaceProperty(<any>ActorHttpFetch, 'userAgent', userAgent);
      expect(actor.prepareRequestHeaders({ input, context: contextWithAuth }).has('authorization')).toBeTruthy();
    });

    it('should not add empty authorization header from context when provided', () => {
      const userAgent = 'actor-determined agent';
      const contextWithAuth = context.set(KeysHttp.auth, '');
      jest.spyOn(ActorHttp, 'isBrowser').mockReturnValue(false);
      jest.replaceProperty(<any>ActorHttpFetch, 'userAgent', userAgent);
      expect(actor.prepareRequestHeaders({ input, context: contextWithAuth }).has('authorization')).toBeFalsy();
    });
  });

  describe('stringToBase64', () => {
    it.each([
      [ 'ASCII', 'abc' ],
      [ 'Unicode', '☃' ],
    ])('should encode %s strings properly', (_: string, value: string) => {
      expect(ActorHttpFetch.stringToBase64(value)).toBe(Buffer.from(value).toString('base64'));
    });
  });
});
