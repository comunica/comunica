import { Readable } from 'stream';
import * as zlib from 'zlib';
import { ActorHttp } from '@comunica/bus-http';
import { KeysCore, KeysHttp } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { LoggerVoid } from '@comunica/logger-void';
import { ActorHttpNative } from '../lib/ActorHttpNative';

const arrayifyStream = require('arrayify-stream');
const mockSetup = require('./__mocks__/follow-redirects').mockSetup;

describe('ActorHttpNative', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
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
      return expect(actor.test({ input: new Request('https://www.google.com/') }))
        .resolves.toEqual({ time: Number.POSITIVE_INFINITY });
    });

    it('should test if headers is iterable', async() => {
      const requestHeaders = new Headers();
      requestHeaders.append('Content-Type', 'application/json');
      requestHeaders.append('Accept-Language', 'en-US,en;q=0.5');
      const result: any = await actor.run({ input: 'http://example.com', init: { headers: requestHeaders }});
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
      return expect(actor.run({ input: new Request('http://example.com') })).resolves
        .toMatchObject({ status: 404 });
    });

    it('should run https', () => {
      mockSetup({ statusCode: 404 });
      return expect(actor.run({ input: new Request('https://example.com') })).resolves
        .toMatchObject({ status: 404 });
    });

    it('should run with agent options', () => {
      actor = new ActorHttpNative({ name: 'actor', bus, agentOptions: '{ "name": "007" }' });
      mockSetup({ statusCode: 404 });
      return expect(actor.run({ input: new Request('http://example.com') })).resolves
        .toMatchObject({ status: 404 });
    });

    it('can have headers', async() => {
      mockSetup({ statusCode: 200 });
      const result: any = await actor.run(
        { input: new Request('http://example.com', { headers: new Headers({ a: 'b' }) }) },
      );
      expect(result).toMatchObject({ status: 200 });
      expect(result.body.input.headers.get('a')).toStrictEqual('b');
      expect(result.body.input.headers.get('user-agent')).toBeTruthy();
    });

    it('can have headers in the init object', async() => {
      mockSetup({ statusCode: 200 });
      const result: any = await actor.run({ input: 'http://example.com', init: { headers: new Headers({ a: 'b' }) }});
      expect(result).toMatchObject({ status: 200 });
      expect(result.body.input.headers.get('a')).toStrictEqual('b');
      expect(result.body.input.headers.get('user-agent')).toBeTruthy();
    });

    it('uses Content-Location header as URL when set with init', async() => {
      const result: any = await actor.run(
        { input: 'http://example.com',
          init: { headers: new Headers({ 'content-location': 'http://example.com/contentlocation' }) }},
      );
      expect(result).toMatchObject({ url: 'http://example.com/contentlocation' });
    });

    it('uses Content-Location header as URL when set with input', async() => {
      const result: any = await actor.run(
        { input: new Request('http://example.com',
          { headers: new Headers({ 'content-location': 'http://example.com/contentlocation' }) }) },
      );
      expect(result).toMatchObject({ url: 'http://example.com/contentlocation' });
    });

    it('should set no user agent if one has been set', async() => {
      mockSetup({ statusCode: 200 });
      const result: any = await actor.run(
        { input: new Request('http://example.com', { headers: new Headers({ 'user-agent': 'b' }) }) },
      );
      expect(result).toMatchObject({ status: 200 });
      expect(result.body.input.headers.get('user-agent')).toBe('b');
    });

    it('should set a user agent if none has been set', async() => {
      mockSetup({ statusCode: 200 });
      const result: any = await actor.run(
        { input: new Request('http://example.com', { headers: new Headers({}) }) },
      );
      expect(result).toMatchObject({ status: 200 });
      expect(result.body.input.headers.get('user-agent')).toBeTruthy();
    });

    it('can decode gzipped streams', async() => {
      const body = new Readable();
      body.push(zlib.gzipSync('apple'));
      body.push(null);
      mockSetup({ statusCode: 200, body, headers: { 'content-encoding': 'gzip' }});
      const result: any = await actor.run({ input: 'http://example.com' });
      expect(result).toMatchObject({ status: 200 });
      const output = await arrayifyStream(result.body);
      expect(output).toContain('apple');
    });

    it('errors on invalid encoding', () => {
      const body = new Readable();
      body.push(zlib.gzipSync('apple'));
      body.push(null);
      mockSetup({ statusCode: 200, body, headers: { 'content-encoding': 'invalid' }});
      return expect(actor.run({ input: new Request('http://example.com') })).rejects
        .toMatchObject(new Error('Unsupported encoding: invalid'));
    });

    it('can have headers in the init object with HEAD', async() => {
      mockSetup({ statusCode: 200 });
      const result: any = await actor.run({ init: { headers: new Headers({ a: 'b' }), method: 'HEAD' },
        input: 'http://example.com' });
      expect(result).toMatchObject({ status: 200 });
    });

    it('can cancel responses', async() => {
      mockSetup({ statusCode: 200 });
      const result: any = await actor.run({ input: 'http://example.com' });
      await expect(result.body.cancel()).resolves.toBeFalsy();
    });

    it('rejects on request errors', async() => {
      mockSetup({ error: true });
      await expect(actor.run({ input: 'http://example.com/reqerror' }))
        .rejects.toThrow(new Error('Request Error!'));
    });

    it('should run without KeysHttp.includeCredentials', async() => {
      mockSetup({ statusCode: 404 });
      const results: any = await actor.run({ input: new Request('http://example.com') });
      expect(results.body).toMatchObject({ withCredentials: undefined });
    });

    it('should run with KeysHttp.includeCredentials', async() => {
      mockSetup({ statusCode: 404 });
      const results: any = await actor.run({
        input: new Request('http://example.com'),
        context: ActionContext({
          [KeysHttp.includeCredentials]: true,
        }),
      });
      expect(results.body).toMatchObject({ withCredentials: true });
    });

    it('should run with authorization', async() => {
      mockSetup({ statusCode: 404 });
      const results: any = await actor.run({
        input: new Request('http://example.com'),
        context: ActionContext({
          [KeysHttp.auth]: 'user:pass',
        }),
      });
      expect(results.body.input.auth).toEqual('user:pass');
    });

    it('should run with a logger', async() => {
      const logger = new LoggerVoid();
      const spy = spyOn(logger, 'info');
      mockSetup({ statusCode: 200 });
      await actor.run({
        input: new Request('http://example.com', { headers: new Headers({ a: 'b' }) }),
        context: ActionContext({ [KeysCore.log]: logger }),
      });
      expect(spy).toHaveBeenCalledWith('Requesting http://example.com/', {
        actor: 'actor',
        headers: { a: 'b', 'user-agent': (<any> actor).userAgent },
      });
    });
  });
});
