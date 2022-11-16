import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import { Readable } from 'stream';
import { ActorHttp } from '@comunica/bus-http';
import { KeysCore, KeysHttp } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { LoggerVoid } from '@comunica/logger-void';
import type { IActionContext } from '@comunica/types';
import { ReadableWebToNodeStream } from 'readable-web-to-node-stream';
import { ActorHttpFetch } from '../lib/ActorHttpFetch';

const streamifyString = require('streamify-string');

// Mock fetch
(<any> global).fetch = jest.fn((input: any, init: any) => {
  return Promise.resolve({
    status: input.url === 'https://www.google.com/' ? 200 : 404,
    ...input.url === 'NOBODY' ? {} : { body: { destroy: jest.fn(), on: jest.fn() }},
  });
});

describe('ActorHttpFetch', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
    jest.clearAllMocks();
  });

  describe('The ActorHttpFetch module', () => {
    it('should be a function', () => {
      expect(ActorHttpFetch).toBeInstanceOf(Function);
    });

    it('should be a ActorHttpFetch constructor', () => {
      expect(new (<any> ActorHttpFetch)({ name: 'actor', bus })).toBeInstanceOf(ActorHttpFetch);
      expect(new (<any> ActorHttpFetch)({ name: 'actor', bus })).toBeInstanceOf(ActorHttp);
    });

    it('should not be able to create new ActorHttpFetch objects without \'new\'', () => {
      expect(() => { (<any> ActorHttpFetch)(); }).toThrow();
    });
  });

  describe('#createUserAgent', () => {
    it('should create a user agent in the browser', () => {
      (<any> global).navigator = { userAgent: 'Dummy' };
      return expect(ActorHttpFetch.createUserAgent())
        .toEqual(`Comunica/actor-http-fetch (Browser-${global.navigator.userAgent})`);
    });

    it('should create a user agent in Node.js', () => {
      delete (<any> global).navigator;
      return expect(ActorHttpFetch.createUserAgent())
        .toEqual(`Comunica/actor-http-fetch (Node.js ${process.version}; ${process.platform})`);
    });
  });

  describe('An ActorHttpFetch instance', () => {
    let actor: ActorHttpFetch;

    beforeEach(() => {
      actor = new ActorHttpFetch({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ input: <Request> { url: 'https://www.google.com/' }, context })).resolves
        .toEqual({ time: Number.POSITIVE_INFINITY });
    });

    it('should run on an existing URI', () => {
      return expect(actor.run({ input: <Request> { url: 'https://www.google.com/' }, context })).resolves
        .toMatchObject({ status: 200 });
    });

    it('should run and pass a custom agent to node-fetch', async() => {
      await actor.run({ input: <Request> { url: 'https://www.google.com/' }, context });

      expect((<any> jest.mocked(fetch).mock.calls[0][1]).agent).toBeInstanceOf(Function);

      expect((<any> jest.mocked(fetch).mock.calls[0][1]).agent(new URL('https://www.google.com/')))
        .toBeInstanceOf(HttpsAgent);
      expect((<any> jest.mocked(fetch).mock.calls[0][1]).agent(new URL('http://www.google.com/')))
        .toBeInstanceOf(HttpAgent);
    });

    it('for custom agent options should run and pass a custom agent to node-fetch', async() => {
      actor = new ActorHttpFetch({ name: 'actor', bus, agentOptions: { keepAlive: true, maxSockets: 5 }});

      await actor.run({ input: <Request> { url: 'https://www.google.com/' }, context });

      expect((<any> jest.mocked(fetch).mock.calls[0][1]).agent).toBeInstanceOf(Function);

      expect((<any> jest.mocked(fetch).mock.calls[0][1]).agent(new URL('https://www.google.com/')))
        .toBeInstanceOf(HttpsAgent);
      expect((<any> jest.mocked(fetch).mock.calls[0][1]).agent(new URL('http://www.google.com/')))
        .toBeInstanceOf(HttpAgent);
    });

    it('should run without body response', () => {
      return expect(actor.run({ input: <Request> { url: 'NOBODY' }, context })).resolves
        .toMatchObject({ status: 404 });
    });

    it('should run on an non-existing URI', () => {
      return expect(actor.run({ input: <Request> { url: 'https://www.google.com/notfound' }, context })).resolves
        .toMatchObject({ status: 404 });
    });

    it('should run for an input object and log', async() => {
      const spy = jest.spyOn(actor, <any> 'logInfo');
      await actor.run({ input: 'https://www.google.com/', context });
      expect(spy).toHaveBeenCalledWith(context, 'Requesting https://www.google.com/', expect.anything());
    });

    it('should run for an input string and log', async() => {
      const spy = jest.spyOn(actor, <any> 'logInfo');
      await actor.run({ input: <Request> { url: 'https://www.google.com/' }, context });
      expect(spy).toHaveBeenCalledWith(context, 'Requesting https://www.google.com/', expect.anything());
    });

    it('should run without KeysHttp.includeCredentials', async() => {
      const spy = jest.spyOn(global, 'fetch');
      await actor.run({
        input: <Request> { url: 'https://www.google.com/' },
        context: new ActionContext({}),
      });
      expect(spy).toHaveBeenCalledWith({ url: 'https://www.google.com/' },
        { headers: new Headers({ 'user-agent': (<any> actor).userAgent }), agent: expect.anything() });
    });

    it('should run with KeysHttp.includeCredentials', async() => {
      const spy = jest.spyOn(global, 'fetch');
      await actor.run({
        input: <Request> { url: 'https://www.google.com/' },
        context: new ActionContext({
          [KeysHttp.includeCredentials.name]: true,
        }),
      });
      expect(spy).toHaveBeenCalledWith({ url: 'https://www.google.com/' }, {
        credentials: 'include',
        headers: new Headers({ 'user-agent': (<any> actor).userAgent }),
        agent: expect.anything(),
      });
    });

    it('should run with authorization', async() => {
      const spy = jest.spyOn(global, 'fetch');
      await actor.run({
        input: <Request> { url: 'https://www.google.com/' },
        context: new ActionContext({
          [KeysHttp.auth.name]: 'user:password',
        }),
      });
      expect(spy).toHaveBeenCalledWith(
        { url: 'https://www.google.com/' },
        {
          headers: new Headers({
            Authorization: `Basic ${Buffer.from('user:password').toString('base64')}`,
            'user-agent': (<any> actor).userAgent,
          }),
          agent: expect.anything(),
        },
      );
    });

    it('should run with authorization and init.headers undefined', async() => {
      const spy = jest.spyOn(global, 'fetch');
      await actor.run({
        input: <Request> { url: 'https://www.google.com/' },
        init: {},
        context: new ActionContext({
          [KeysHttp.auth.name]: 'user:password',
        }),
      });
      expect(spy).toHaveBeenCalledWith(
        { url: 'https://www.google.com/' },
        {
          headers: new Headers({
            Authorization: `Basic ${Buffer.from('user:password').toString('base64')}`,
            'user-agent': (<any> actor).userAgent,
          }),
          agent: expect.anything(),
        },
      );
    });

    it('should run with authorization and already header in init', async() => {
      const spy = jest.spyOn(global, 'fetch');

      await actor.run({
        input: <Request> { url: 'https://www.google.com/' },
        init: { headers: new Headers({ 'Content-Type': 'image/jpeg' }) },
        context: new ActionContext({
          [KeysHttp.auth.name]: 'user:password',
        }),
      });
      expect(spy).toHaveBeenCalledWith(
        { url: 'https://www.google.com/' },
        {
          headers: new Headers({
            Authorization: `Basic ${Buffer.from('user:password').toString('base64')}`,
            'Content-Type': 'image/jpeg',
            'user-agent': (<any> actor).userAgent,
          }),
          agent: expect.anything(),
        },
      );
    });

    it('should run with a logger', async() => {
      const logger = new LoggerVoid();
      const spy = jest.spyOn(logger, 'info');
      await actor.run({
        input: <Request> { url: 'https://www.google.com/' },
        init: { headers: new Headers({ a: 'b' }) },
        context: new ActionContext({ [KeysCore.log.name]: logger }),
      });
      expect(spy).toHaveBeenCalledWith('Requesting https://www.google.com/', {
        actor: 'actor',
        headers: { a: 'b', 'user-agent': (<any> actor).userAgent },
        method: 'GET',
      });
    });

    it('should run with a logger without init', async() => {
      const logger = new LoggerVoid();
      const spy = jest.spyOn(logger, 'info');
      await actor.run({
        input: <Request> { url: 'https://www.google.com/' },
        context: new ActionContext({ [KeysCore.log.name]: logger }),
      });
      expect(spy).toHaveBeenCalledWith('Requesting https://www.google.com/', {
        actor: 'actor',
        headers: { 'user-agent': (<any> actor).userAgent },
        method: 'GET',
      });
    });

    it('should run with a logger with another another method', async() => {
      const logger = new LoggerVoid();
      const spy = jest.spyOn(logger, 'info');
      await actor.run({
        input: <Request> { url: 'https://www.google.com/' },
        init: { headers: new Headers({ a: 'b' }), method: 'POST' },
        context: new ActionContext({ [KeysCore.log.name]: logger }),
      });
      expect(spy).toHaveBeenCalledWith('Requesting https://www.google.com/', {
        actor: 'actor',
        headers: { a: 'b', 'user-agent': (<any> actor).userAgent },
        method: 'POST',
      });
    });

    it('should set no user agent if one has been set', async() => {
      const spy = jest.spyOn(global, 'fetch');
      await actor.run({
        input: <Request> { url: 'https://www.google.com/' },
        init: { headers: new Headers({ 'user-agent': 'b' }) },
        context,
      });
      expect(spy).toHaveBeenCalledWith({ url: 'https://www.google.com/' },
        { headers: new Headers({ 'user-agent': 'b' }), agent: expect.anything() });
    });

    it('should set a user agent if none has been set', async() => {
      const spy = jest.spyOn(global, 'fetch');
      await actor.run({
        input: <Request> { url: 'https://www.google.com/' },
        init: { headers: new Headers({}) },
        context,
      });
      expect(spy).toHaveBeenCalledWith({ url: 'https://www.google.com/' },
        { headers: new Headers({ 'user-agent': (<any> actor).userAgent }), agent: expect.anything() });
    });

    it('should run and expose body.cancel', async() => {
      const response = await actor.run({ input: <Request> { url: 'https://www.google.com/' }, context });
      expect((<any> response.body).destroy).not.toHaveBeenCalled();
      expect(response.body!.cancel).toBeTruthy();

      const closeError = new Error('node-fetch close');
      await response.body!.cancel(closeError);

      expect((<any> response.body).destroy).toHaveBeenCalledWith(closeError);
    });

    it('should run with a Node.js body', async() => {
      const spy = jest.spyOn(global, 'fetch');
      const body = <any> new Readable();
      await actor.run({ input: <Request> { url: 'https://www.google.com/' }, init: { body }, context });

      expect(spy).toHaveBeenCalledWith(
        { url: 'https://www.google.com/' },
        {
          body,
          agent: expect.anything(),
          headers: expect.anything(),
        },
      );
    });

    it('should run with a Web stream body', async() => {
      const spy = jest.spyOn(global, 'fetch');
      const body = ActorHttp.toWebReadableStream(streamifyString('a'));
      await actor.run({ input: <Request> { url: 'https://www.google.com/' }, init: { body }, context });

      expect(spy).toHaveBeenCalledWith(
        { url: 'https://www.google.com/' },
        {
          body: expect.any(ReadableWebToNodeStream),
          agent: expect.anything(),
          headers: expect.anything(),
        },
      );
    });

    it('should run with a custom fetch function', async() => {
      const customFetch = jest.fn(async() => ({}));
      await actor.run({
        input: <Request> { url: 'https://www.google.com/' },
        context: new ActionContext({ [KeysHttp.fetch.name]: customFetch }),
      });

      expect(fetch).not.toHaveBeenCalled();
      expect(customFetch).toHaveBeenCalled();
    });

    it('should run with headers and a custom fetch function to trigger temporary workaround', async() => {
      const customFetch = jest.fn(async() => ({}));
      await actor.run({
        input: <Request> { url: 'https://www.google.com/' },
        context: new ActionContext({ [KeysHttp.fetch.name]: customFetch }),
      });

      expect(fetch).not.toHaveBeenCalled();
      expect(customFetch).toHaveBeenCalled();
    });

    it('should work with a large timeout', async() => {
      jest.spyOn(global, 'clearTimeout');
      await expect(actor.run({
        input: <Request> { url: 'https://www.google.com/' },
        context: new ActionContext({ [KeysHttp.httpTimeout.name]: 100_000 }),
      })).resolves.toMatchObject({ status: 200 });
      expect(clearTimeout).toHaveBeenCalled();
    });

    it('should work with a large timeout with an error', async() => {
      jest.spyOn(global, 'clearTimeout');
      const customFetch = jest.fn(async(_, _init) => {
        throw new Error('foo');
      });
      await expect(actor.run({
        input: <Request> { url: 'https://www.google.com/' },
        context: new ActionContext({ [KeysHttp.fetch.name]: customFetch, [KeysHttp.httpTimeout.name]: 100_000 }),
      })).rejects.toBeInstanceOf(Error);
      expect(clearTimeout).toHaveBeenCalled();
    });

    it('should abort properly with a timeout', async() => {
      jest.useFakeTimers();
      const customFetch = jest.fn(async(_, init) => {
        expect(init.signal.constructor.name).toEqual('AbortSignal');
        expect(init.signal.aborted).toEqual(false);
        jest.runAllTimers();
        expect(init.signal.aborted).toEqual(true);
        throw new Error('foo');
      });
      await expect(actor.run({
        input: <Request> { url: 'https://www.google.com/' },
        context: new ActionContext({ [KeysHttp.fetch.name]: customFetch, [KeysHttp.httpTimeout.name]: 10 }),
      })).rejects.toThrow('foo');
      jest.useRealTimers();
    });

    it('should work with a large timeout including body if there is no body', async() => {
      jest.spyOn(global, 'clearTimeout');
      await expect(actor.run({
        input: <Request> { url: 'NOBODY' },
        context: new ActionContext({ [KeysHttp.httpTimeout.name]: 100_000, [KeysHttp.httpBodyTimeout.name]: true }),
      })).resolves.toMatchObject({ status: 404 });
      expect(clearTimeout).toHaveBeenCalled();
    });

    it('should work with a large timeout including body if the body is consumed', async() => {
      jest.spyOn(global, 'clearTimeout');
      const customFetch = jest.fn(async(_, _init) => {
        const body = Readable.from('foo');
        return Promise.resolve({
          body,
        });
      });
      const response = await actor.run({
        input: <Request> { url: 'https://www.google.com/' },
        context: new ActionContext({
          [KeysHttp.fetch.name]: customFetch,
          [KeysHttp.httpTimeout.name]: 100_000,
          [KeysHttp.httpBodyTimeout.name]: true,
        }),
      });
      const body = <Readable><any> response.body;
      for await (const chunk of body) {
        // We just want to consume everything
      }
      expect(clearTimeout).toHaveBeenCalled();
    });

    it('should work with a large timeout including body if the body is cancelled', async() => {
      jest.spyOn(global, 'clearTimeout');
      const customFetch = jest.fn(async(_, _init) => {
        const body = Readable.from('foo');
        return Promise.resolve({
          body,
        });
      });
      const response = await actor.run({
        input: <Request> { url: 'https://www.google.com/' },
        context: new ActionContext({
          [KeysHttp.fetch.name]: customFetch,
          [KeysHttp.httpTimeout.name]: 100_000,
          [KeysHttp.httpBodyTimeout.name]: true,
        }),
      });
      await response.body?.cancel();
      expect(clearTimeout).toHaveBeenCalled();
    });

    it('should abort properly with a timeout including body', async() => {
      jest.useFakeTimers();
      const response = await actor.run({
        input: <Request> { url: 'https://www.google.com/' },
        context: new ActionContext({ [KeysHttp.httpTimeout.name]: 20, [KeysHttp.httpBodyTimeout.name]: true }),
      });
      expect((<any> response.body).destroy).not.toHaveBeenCalled();
      expect(response.body!.cancel).toBeTruthy();

      jest.runAllTimers();
      expect((<any> response.body).destroy).toHaveBeenCalledWith(
        new Error(`HTTP timeout when reading the body of undefined.
This error can be disabled by modifying the 'httpBodyTimeout' and/or 'httpTimeout' options.`),
      );
      jest.useRealTimers();
    });

    it('should retry with a delay', async() => {
      let numberOfRetries = 0;
      const customFetch = jest.fn(async() => {
        if (numberOfRetries < 2) {
          numberOfRetries++;
          throw new Error('Retry count not reached.');
        }
        return {};
      });

      await actor.run({
        input: <Request> { url: 'ignored by custom fetch' },
        context: new ActionContext({
          [KeysHttp.fetch.name]: customFetch,
          [KeysHttp.httpRetryCount.name]: 2,
          [KeysHttp.httpRetryDelay.name]: 100,
        }),
      });

      expect(customFetch).toBeCalledTimes(3);
    });

    it('should abort, if retry count was exceeded', async() => {
      const error = new Error('This fetch is supposed to fail and be retried.');
      const customFetch = jest.fn(async() => {
        throw error;
      });

      await expect(actor.run({
        input: <Request> { url: 'ignored by custom fetch' },
        context: new ActionContext({
          [KeysHttp.fetch.name]: customFetch,
          [KeysHttp.httpRetryCount.name]: 2,
        }),
      })).rejects.toThrow(`Number of fetch retries (${2}) exceeded. Last error: ${String(error)}`);

      expect(customFetch).toBeCalledTimes(3);
    });

    it('should abort retry delay on timeout', async() => {
      const customFetch = jest.fn(async() => {
        throw new Error('This fetch is supposed to fail and be retried.');
      });
      await expect(actor.run({
        input: <Request> { url: 'ignored by custom fetch' },
        context: new ActionContext({
          [KeysHttp.fetch.name]: customFetch,
          [KeysHttp.httpTimeout.name]: 50,
          [KeysHttp.httpRetryCount.name]: 1,
          [KeysHttp.httpRetryDelay.name]: 500,
        }),
      })).rejects.toThrow(`Fetch aborted by timeout.`);
      expect(customFetch).toBeCalledTimes(1);
    });

    it('should retry, when server replies with an internal server error 5xx response', async() => {
      const response = new Response(undefined, { status: 503, statusText: 'currently not available' });
      const customFetch = jest.fn(async() => {
        return response;
      });

      await expect(actor.run({
        input: <Request> { url: 'ignored by custom fetch' },
        context: new ActionContext({
          [KeysHttp.fetch.name]: customFetch,
          [KeysHttp.httpRetryCount.name]: 1,
          [KeysHttp.httpRetryOnServerError.name]: true,
        }),
      })).rejects.toThrow(`Server replied with response code ${response.status}: ${response.statusText}`);

      expect(customFetch).toBeCalledTimes(2);
    });
  });
});
