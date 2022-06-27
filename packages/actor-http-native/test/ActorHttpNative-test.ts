import { Readable } from 'stream';
import * as zlib from 'zlib';
import { ActorHttp } from '@comunica/bus-http';
import { KeysCore, KeysHttp } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { LoggerVoid } from '@comunica/logger-void';
import type { IActionContext } from '@comunica/types';
import { AbortController } from 'abort-controller';
import arrayifyStream from 'arrayify-stream';
import { ActorHttpNative } from '../lib/ActorHttpNative';

const mockSetup = require('./__mocks__/follow-redirects').mockSetup;

describe('ActorHttpNative', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('The ActorHttpNative module', () => {
    it('should be a function', () => {
      expect(ActorHttpNative).toBeInstanceOf(Function);
    });

    it('should be a ActorHttpNative constructor', () => {
      expect(new (<any> ActorHttpNative)({ name: 'actor', bus })).toBeInstanceOf(ActorHttpNative);
      expect(new (<any> ActorHttpNative)({ name: 'actor', bus })).toBeInstanceOf(ActorHttp);
    });

    it('should not be able to create new ActorHttpNative objects without \'new\'', () => {
      expect(() => { (<any> ActorHttpNative)(); }).toThrow();
    });
  });

  describe('#createUserAgent', () => {
    it('should create a user agent in the browser', () => {
      (<any> global).navigator = { userAgent: 'Dummy' };
      return expect(ActorHttpNative.createUserAgent())
        .toEqual(`Comunica/actor-http-native (Browser-${global.navigator.userAgent})`);
    });

    it('should create a user agent in Node.js', () => {
      delete (<any> global).navigator;
      return expect(ActorHttpNative.createUserAgent())
        .toEqual(`Comunica/actor-http-native (Node.js ${process.version}; ${process.platform})`);
    });
  });

  describe('An ActorHttpNative instance', () => {
    let actor: ActorHttpNative;

    beforeEach(() => {
      actor = new ActorHttpNative({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ context, input: new Request('https://www.google.com/') }))
        .resolves.toEqual({ time: Number.POSITIVE_INFINITY });
    });

    it('should test if headers is iterable', async() => {
      const requestHeaders = new Headers();
      requestHeaders.append('Content-Type', 'application/json');
      requestHeaders.append('Accept-Language', 'en-US,en;q=0.5');
      const result: any = await actor.run({ context, input: 'http://example.com', init: { headers: requestHeaders }});
      const res: string[] = [];
      for (const element of result.body.input.headers) {
        res.push(element);
      }
      expect(res[0]).toStrictEqual([ 'accept-language', 'en-US,en;q=0.5' ]);
      expect(res[1]).toStrictEqual([ 'content-type', 'application/json' ]);
      expect(res[2][0]).toStrictEqual('user-agent');
    });

    it('should run', () => {
      mockSetup({ statusCode: 404 });
      return expect(actor.run({ context, input: new Request('http://example.com') })).resolves
        .toMatchObject({ status: 404 });
    });

    it('should run https', () => {
      mockSetup({ statusCode: 404 });
      return expect(actor.run({ context, input: new Request('https://example.com') })).resolves
        .toMatchObject({ status: 404 });
    });

    it('should run with agent options', () => {
      actor = new ActorHttpNative({ name: 'actor', bus, agentOptions: { name: '007' }});
      mockSetup({ statusCode: 404 });
      return expect(actor.run({ context, input: new Request('http://example.com') })).resolves
        .toMatchObject({ status: 404 });
    });

    it('can have headers', async() => {
      mockSetup({ statusCode: 200 });
      const result: any = await actor.run(
        { context, input: new Request('http://example.com', { headers: new Headers({ a: 'b' }) }) },
      );
      expect(result).toMatchObject({ status: 200 });
      expect(result.body.input.headers.get('a')).toStrictEqual('b');
      expect(result.body.input.headers.get('user-agent')).toBeTruthy();
    });

    it('can have headers in the init object', async() => {
      mockSetup({ statusCode: 200 });
      const result: any = await actor.run({
        context,
        input: 'http://example.com',
        init: { headers: new Headers({ a: 'b' }) },
      });
      expect(result).toMatchObject({ status: 200 });
      expect(result.body.input.headers.get('a')).toStrictEqual('b');
      expect(result.body.input.headers.get('user-agent')).toBeTruthy();
    });

    it('uses Content-Location header as URL when set with init', async() => {
      const result: any = await actor.run(
        { context,
          input: 'http://example.com',
          init: { headers: new Headers({ 'content-location': 'http://example.com/contentlocation' }) }},
      );
      expect(result).toMatchObject({ url: 'http://example.com/contentlocation' });
    });

    it('uses Content-Location header as URL when set with input', async() => {
      const result: any = await actor.run(
        { context,
          input: new Request('http://example.com',
            { headers: new Headers({ 'content-location': 'http://example.com/contentlocation' }) }) },
      );
      expect(result).toMatchObject({ url: 'http://example.com/contentlocation' });
    });

    it('should set no user agent if one has been set', async() => {
      mockSetup({ statusCode: 200 });
      const result: any = await actor.run(
        { context, input: new Request('http://example.com', { headers: new Headers({ 'user-agent': 'b' }) }) },
      );
      expect(result).toMatchObject({ status: 200 });
      expect(result.body.input.headers.get('user-agent')).toBe('b');
    });

    it('should set a user agent if none has been set', async() => {
      mockSetup({ statusCode: 200 });
      const result: any = await actor.run(
        { context, input: new Request('http://example.com', { headers: new Headers({}) }) },
      );
      expect(result).toMatchObject({ status: 200 });
      expect(result.body.input.headers.get('user-agent')).toBeTruthy();
    });

    it('can decode gzipped streams', async() => {
      const body = new Readable();
      body.push(zlib.gzipSync('apple'));
      body.push(null);
      mockSetup({ statusCode: 200, body, headers: { 'content-encoding': 'gzip' }});
      const result: any = await actor.run({ context, input: 'http://example.com' });
      expect(result).toMatchObject({ status: 200 });
      const output = await arrayifyStream(result.body);
      expect(output).toContain('apple');
    });

    it('errors on invalid encoding', () => {
      const body = new Readable();
      body.push(zlib.gzipSync('apple'));
      body.push(null);
      mockSetup({ statusCode: 200, body, headers: { 'content-encoding': 'invalid' }});
      return expect(actor.run({ context, input: new Request('http://example.com') })).rejects
        .toMatchObject(new Error('Unsupported encoding: invalid'));
    });

    it('can have headers in the init object with HEAD', async() => {
      mockSetup({ statusCode: 200 });
      const result: any = await actor.run({ context,
        init: { headers: new Headers({ a: 'b' }), method: 'HEAD' },
        input: 'http://example.com' });
      expect(result).toMatchObject({ status: 200 });
    });

    it('can cancel responses', async() => {
      mockSetup({ statusCode: 200 });
      const result: any = await actor.run({ context, input: 'http://example.com' });
      await expect(result.body.cancel()).resolves.toBeFalsy();
    });

    it('rejects on request errors', async() => {
      mockSetup({ error: true });
      await expect(actor.run({ context, input: 'http://example.com/reqerror' }))
        .rejects.toThrow(new Error('Request Error!'));
    });

    it('should run without KeysHttp.includeCredentials', async() => {
      mockSetup({ statusCode: 404 });
      const results: any = await actor.run({ context, input: new Request('http://example.com') });
      expect(results.body).toMatchObject({ withCredentials: undefined });
    });

    it('should run with KeysHttp.includeCredentials', async() => {
      mockSetup({ statusCode: 404 });
      const results: any = await actor.run({
        input: new Request('http://example.com'),
        context: new ActionContext({
          [KeysHttp.includeCredentials.name]: true,
        }),
      });
      expect(results.body).toMatchObject({ withCredentials: true });
    });

    it('should run with authorization', async() => {
      mockSetup({ statusCode: 404 });
      const results: any = await actor.run({
        input: new Request('http://example.com'),
        context: new ActionContext({
          [KeysHttp.auth.name]: 'user:pass',
        }),
      });
      expect(results.body.input.auth).toEqual('user:pass');
    });

    it('should run with a logger', async() => {
      const logger = new LoggerVoid();
      const spy = jest.spyOn(logger, 'info');
      mockSetup({ statusCode: 200 });
      await actor.run({
        input: new Request('http://example.com', { headers: new Headers({ a: 'b' }) }),
        context: new ActionContext({ [KeysCore.log.name]: logger }),
      });
      expect(spy).toHaveBeenCalledWith('Requesting http://example.com/', {
        actor: 'actor',
        headers: { a: 'b', 'user-agent': (<any> actor).userAgent },
        method: 'GET',
      });
    });

    it('should throw when the given body via input', async() => {
      await expect(actor.run(
        { context, input: new Request('http://example.com', { body: new ReadableStream(), method: 'POST' }) },
      )).rejects.toThrow(new Error('ActorHttpNative does not support passing body via input, use init instead.'));
    });

    it('should send the given body via init', async() => {
      mockSetup({ statusCode: 200 });
      const result: any = await actor.run(
        { context, input: new Request('http://example.com'), init: { body: new ReadableStream(), method: 'POST' }},
      );
      expect(result).toMatchObject({ status: 200 });
    });

    it('should send the given URLSearchParams body via init', async() => {
      mockSetup({ statusCode: 200 });
      const result: any = await actor.run(
        { context, input: new Request('http://example.com'), init: { body: new URLSearchParams(), method: 'POST' }},
      );
      expect(result).toMatchObject({ status: 200 });
    });

    it('should send the given string body via init', async() => {
      mockSetup({ statusCode: 200 });
      const result: any = await actor.run(
        { context, input: new Request('http://example.com'), init: { body: 'my-body', method: 'POST' }},
      );
      expect(result).toMatchObject({ status: 200 });
    });

    it('should handle an abort controller signal that does nothing', () => {
      mockSetup({ statusCode: 200 });
      const abortController = new AbortController();
      return expect(actor.run({
        context,
        input: new Request('http://example.com'),
        init: { signal: <any> abortController.signal },
      })).resolves.toMatchObject({ status: 200 });
    });

    it('should handle an abort controller signal that is aborted immediately', async() => {
      mockSetup({ statusCode: 200 });
      const abortController = new AbortController();
      abortController.abort();
      const response = await actor.run({
        context,
        input: new Request('http://example.com'),
        init: { signal: <any> abortController.signal },
      });
      expect(response.status).toEqual(200);
      expect((<any> response).body.destroy).toHaveBeenCalled();
    });

    it('should handle an abort controller signal that is aborted later', async() => {
      mockSetup({ statusCode: 200 });
      const abortController = new AbortController();
      const response = await actor.run({
        context,
        input: new Request('http://example.com'),
        init: { signal: <any> abortController.signal },
      });
      expect((<any> response).body.destroy).not.toHaveBeenCalled();
      expect(response.status).toEqual(200);

      abortController.abort();

      expect((<any> response).body.destroy).toHaveBeenCalled();
    });
  });
});
