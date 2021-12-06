import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import { Readable } from 'stream';
import { ActorHttp } from '@comunica/bus-http';
import { KeysCore, KeysHttp } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { LoggerVoid } from '@comunica/logger-void';
import { ReadableWebToNodeStream } from 'readable-web-to-node-stream';
import { mocked } from 'ts-jest/utils';
import { ActorHttpNodeFetch } from '../lib/ActorHttpNodeFetch';
const streamifyString = require('streamify-string');

// Mock fetch
(<any> global).fetch = jest.fn((input: any, init: any) => {
  return Promise.resolve({
    status: input.url === 'https://www.google.com/' ? 200 : 404,
    ...input.url === 'NOBODY' ? {} : { body: { destroy: jest.fn() }},
  });
});

describe('ActorHttpNodeFetch', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    jest.clearAllMocks();
  });

  describe('The ActorHttpNodeFetch module', () => {
    it('should be a function', () => {
      expect(ActorHttpNodeFetch).toBeInstanceOf(Function);
    });

    it('should be a ActorHttpNodeFetch constructor', () => {
      expect(new (<any> ActorHttpNodeFetch)({ name: 'actor', bus })).toBeInstanceOf(ActorHttpNodeFetch);
      expect(new (<any> ActorHttpNodeFetch)({ name: 'actor', bus })).toBeInstanceOf(ActorHttp);
    });

    it('should not be able to create new ActorHttpNodeFetch objects without \'new\'', () => {
      expect(() => { (<any> ActorHttpNodeFetch)(); }).toThrow();
    });
  });

  describe('#createUserAgent', () => {
    it('should create a user agent in the browser', () => {
      (<any> global).navigator = { userAgent: 'Dummy' };
      return expect(ActorHttpNodeFetch.createUserAgent())
        .toEqual(`Comunica/actor-http-node-fetch (Browser-${global.navigator.userAgent})`);
    });

    it('should create a user agent in Node.js', () => {
      delete (<any> global).navigator;
      return expect(ActorHttpNodeFetch.createUserAgent())
        .toEqual(`Comunica/actor-http-node-fetch (Node.js ${process.version}; ${process.platform})`);
    });
  });

  describe('An ActorHttpNodeFetch instance', () => {
    let actor: ActorHttpNodeFetch;

    beforeEach(() => {
      actor = new ActorHttpNodeFetch({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ input: <Request> { url: 'https://www.google.com/' }})).resolves
        .toEqual({ time: Number.POSITIVE_INFINITY });
    });

    it('should run on an existing URI', () => {
      return expect(actor.run({ input: <Request> { url: 'https://www.google.com/' }})).resolves
        .toMatchObject({ status: 200 });
    });

    it('should run and pass a custom agent to node-fetch', async() => {
      await actor.run({ input: <Request> { url: 'https://www.google.com/' }});

      expect((<any> mocked(fetch).mock.calls[0][1]).agent).toBeInstanceOf(Function);

      expect((<any> mocked(fetch).mock.calls[0][1]).agent(new URL('https://www.google.com/')))
        .toBeInstanceOf(HttpsAgent);
      expect((<any> mocked(fetch).mock.calls[0][1]).agent(new URL('http://www.google.com/')))
        .toBeInstanceOf(HttpAgent);
    });

    it('for custom agent options should run and pass a custom agent to node-fetch', async() => {
      actor = new ActorHttpNodeFetch({ name: 'actor', bus, agentOptions: { keepAlive: true, maxSockets: 5 }});

      await actor.run({ input: <Request> { url: 'https://www.google.com/' }});

      expect((<any> mocked(fetch).mock.calls[0][1]).agent).toBeInstanceOf(Function);

      expect((<any> mocked(fetch).mock.calls[0][1]).agent(new URL('https://www.google.com/')))
        .toBeInstanceOf(HttpsAgent);
      expect((<any> mocked(fetch).mock.calls[0][1]).agent(new URL('http://www.google.com/')))
        .toBeInstanceOf(HttpAgent);
    });

    it('should run without body response', () => {
      return expect(actor.run({ input: <Request> { url: 'NOBODY' }})).resolves
        .toMatchObject({ status: 404 });
    });

    it('should run on an non-existing URI', () => {
      return expect(actor.run({ input: <Request> { url: 'https://www.google.com/notfound' }})).resolves
        .toMatchObject({ status: 404 });
    });

    it('should run for an input object and log', async() => {
      const spy = jest.spyOn(actor, <any> 'logInfo');
      await actor.run({ input: 'https://www.google.com/' });
      expect(spy).toHaveBeenCalledWith(undefined, 'Requesting https://www.google.com/', expect.anything());
    });

    it('should run for an input string and log', async() => {
      const spy = jest.spyOn(actor, <any> 'logInfo');
      await actor.run({ input: <Request> { url: 'https://www.google.com/' }});
      expect(spy).toHaveBeenCalledWith(undefined, 'Requesting https://www.google.com/', expect.anything());
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
      });
      expect(spy).toHaveBeenCalledWith({ url: 'https://www.google.com/' },
        { headers: new Headers({ 'user-agent': 'b' }), agent: expect.anything() });
    });

    it('should set a user agent if none has been set', async() => {
      const spy = jest.spyOn(global, 'fetch');
      await actor.run({
        input: <Request> { url: 'https://www.google.com/' },
        init: { headers: new Headers({}) },
      });
      expect(spy).toHaveBeenCalledWith({ url: 'https://www.google.com/' },
        { headers: new Headers({ 'user-agent': (<any> actor).userAgent }), agent: expect.anything() });
    });

    it('should run and expose body.cancel', async() => {
      const response = await actor.run({ input: <Request> { url: 'https://www.google.com/' }});
      expect((<any> response.body).destroy).not.toHaveBeenCalled();
      expect(response.body!.cancel).toBeTruthy();

      const closeError = new Error('node-fetch close');
      await response.body!.cancel(closeError);

      expect((<any> response.body).destroy).toHaveBeenCalledWith(closeError);
    });

    it('should run with a Node.js body', async() => {
      const spy = jest.spyOn(global, 'fetch');
      const body = <any> new Readable();
      await actor.run({ input: <Request> { url: 'https://www.google.com/' }, init: { body }});

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
      await actor.run({ input: <Request> { url: 'https://www.google.com/' }, init: { body }});

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
  });
});
