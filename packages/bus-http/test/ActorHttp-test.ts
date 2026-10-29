import { Readable } from 'readable-stream';
import { ActorHttp } from '../lib/ActorHttp';
import 'cross-fetch/polyfill';

const readableToWeb = require('readable-stream-node-to-web');

describe('ActorHttp', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('toNodeReadable', () => {
    it('should handle null input', () => {
      expect(ActorHttp.toNodeReadable(null)).toBeNull();
    });

    it('should handle WHATWG ReadableStream', () => {
      const readableStream = Readable.from([ 'CONTENT' ]);
      const whatwgReadableStream = readableToWeb(readableStream);
      expect(ActorHttp.toNodeReadable(whatwgReadableStream)).toBeInstanceOf(Readable);
    });
  });

  describe('toWebReadableStream', () => {
    it('should handle null input', () => {
      expect(() => ActorHttp.toWebReadableStream(null)).toThrow('Cannot read properties of null (reading \'on\')');
    });

    it('should handle NodeJS.ReadableStream', () => {
      const readableStream = Readable.from([ 'CONTENT' ]);
      expect(ActorHttp.toWebReadableStream(readableStream)).toBeInstanceOf(ReadableStream);
    });
  });

  describe('headersToHash', () => {
    it('should handle empty headers', () => {
      expect(ActorHttp.headersToHash(new Headers())).toEqual({});
    });

    it('should handle non-empty headers', () => {
      expect(ActorHttp.headersToHash(new Headers({
        a: 'b',
        c: 'd',
      }))).toEqual({
        a: 'b',
        c: 'd',
      });
    });

    it('should handle headers with multi-valued entries', () => {
      expect(ActorHttp.headersToHash(new Headers([
        [ 'a', 'a1' ],
        [ 'a', 'a2' ],
        [ 'b', 'b1' ],
        [ 'b', 'b2' ],
      ]))).toEqual({
        a: 'a1, a2',
        b: 'b1, b2',
      });
    });
  });

  describe('getInputUrl', () => {
    const url = 'http://example.org/abc';

    it('should handle string values', () => {
      expect(ActorHttp.getInputUrl(url).href).toBe(url);
    });

    it('should handle Request objects', () => {
      expect(ActorHttp.getInputUrl(new Request(url)).href).toBe(url);
    });

    it('should handle URL objects', () => {
      expect(ActorHttp.getInputUrl(new URL(url)).href).toBe(url);
    });
  });

  describe('createUserAgent', () => {
    const actorName = 'ActorHttp';
    const actorVersion = '1.2.3';

    let originalNavigator: any;
    let originalProcess: any;

    beforeEach(() => {
      originalProcess = globalThis.process;
      originalNavigator = globalThis.navigator;
      delete (<any>globalThis).process;
      delete (<any>globalThis).navigator;
    });

    afterEach(() => {
      globalThis.process = originalProcess;
      globalThis.navigator = originalNavigator;
      delete (<any>globalThis).window;
    });

    it('should return undefined in browser environments', () => {
      expect(globalThis.window).toBeUndefined();
      expect(globalThis.process).toBeUndefined();
      expect(globalThis.navigator).toBeUndefined();
      vi.spyOn(ActorHttp, 'isBrowser').mockReturnValue(true);
      expect(ActorHttp.createUserAgent(actorName, actorVersion)).toBeUndefined();
    });

    it('should construct custom agent from navigator.userAgent in non-browser environments', () => {
      expect(globalThis.window).toBeUndefined();
      expect(globalThis.process).toBeUndefined();
      expect(globalThis.navigator).toBeUndefined();
      vi.spyOn(ActorHttp, 'isBrowser').mockReturnValue(false);
      globalThis.navigator = <any>{ userAgent: 'Runtime/2.3.4' };
      const userAgent = ActorHttp.createUserAgent(actorName, actorVersion);
      expect(userAgent).toBeDefined();
      expect(userAgent).toMatch(/^Comunica\/1.0 ActorHttp\/1.2.3 Runtime\/2.3.4$/u);
    });

    it('should construct custom agent from navigator.userAgent in non-browser environments with platform data', () => {
      expect(globalThis.window).toBeUndefined();
      expect(globalThis.navigator).toBeUndefined();
      vi.spyOn(ActorHttp, 'isBrowser').mockReturnValue(false);
      globalThis.process = <any>{ platform: 'abc', arch: 'x128' };
      globalThis.navigator = <any>{ userAgent: 'Runtime/2.3.4' };
      const userAgent = ActorHttp.createUserAgent(actorName, actorVersion);
      expect(userAgent).toBeDefined();
      expect(userAgent).toMatch(/^Comunica\/1.0 \(abc; x128\) ActorHttp\/1.2.3 Runtime\/2.3.4$/u);
    });

    it('should construct custom agent from process.versions.node when navigator is unavailable', () => {
      expect(globalThis.window).toBeUndefined();
      expect(globalThis.process).toBeUndefined();
      expect(globalThis.navigator).toBeUndefined();
      vi.spyOn(ActorHttp, 'isBrowser').mockReturnValue(false);
      globalThis.process = <any>{ versions: { node: '20.3.4' }};
      const userAgent = ActorHttp.createUserAgent(actorName, actorVersion);
      expect(userAgent).toBeDefined();
      expect(userAgent).toMatch(/^Comunica\/1.0 ActorHttp\/1.2.3 Node.js\/20$/u);
    });

    it('should construct custom agent without runtime info when neither navigator nor process are defined', () => {
      expect(globalThis.window).toBeUndefined();
      expect(globalThis.process).toBeUndefined();
      expect(globalThis.navigator).toBeUndefined();
      vi.spyOn(ActorHttp, 'isBrowser').mockReturnValue(false);
      const userAgent = ActorHttp.createUserAgent(actorName, actorVersion);
      expect(userAgent).toBeDefined();
      expect(userAgent).toMatch(/^Comunica\/1.0 ActorHttp\/1.2.3$/u);
    });
  });

  describe('request helpers', () => {
    it('getRequestMethod should derive the method from init', () => {
      expect(ActorHttp.getRequestMethod(<any> { input: 'http://example.org/', init: { method: 'POST' }})).toBe('POST');
    });

    it('getRequestMethod should fall back to GET', () => {
      expect(ActorHttp.getRequestMethod(<any> { input: 'http://example.org/' })).toBe('GET');
    });

    it('getRequestMethod should derive the method from a Request input when init.method is undefined', () => {
      const request = new Request('http://example.org/', { method: 'DELETE' });
      expect(ActorHttp.getRequestMethod(<any> { input: request })).toBe('DELETE');
    });

    it('isReplayableRequestBody should return false for Request bodies (streams)', () => {
      const request = new Request('http://example.org/', { method: 'POST', body: 'abc' });
      expect(ActorHttp.isReplayableRequestBody(<any> { input: request })).toBe(false);
    });

    it('isReplayableBody should return true for supported BodyInit values', () => {
      expect(ActorHttp.isReplayableBody(null)).toBe(true);
      expect(ActorHttp.isReplayableBody(undefined)).toBe(true);
      expect(ActorHttp.isReplayableBody('abc')).toBe(true);
      expect(ActorHttp.isReplayableBody(new URLSearchParams('a=b'))).toBe(true);
      expect(ActorHttp.isReplayableBody(new FormData())).toBe(true);
      expect(ActorHttp.isReplayableBody(new ArrayBuffer(1))).toBe(true);
      expect(ActorHttp.isReplayableBody(new Uint8Array([ 1, 2, 3 ]))).toBe(true);
      expect(ActorHttp.isReplayableBody(new Blob([ 'a' ]))).toBe(true);
      expect(ActorHttp.isReplayableBody({})).toBe(false);
    });

    it('isIdempotentMethod should detect idempotent methods', () => {
      for (const method of [ 'GET', 'head', 'PUT', 'DELETE', 'OPTIONS', 'TRACE', 'QUERY' ]) {
        expect(ActorHttp.isIdempotentMethod(method)).toBe(true);
      }
      expect(ActorHttp.isIdempotentMethod('POST')).toBe(false);
      expect(ActorHttp.isIdempotentMethod('PATCH')).toBe(false);
    });

    it('isReplayableRequestBody should return true without body', () => {
      expect(ActorHttp.isReplayableRequestBody(<any> { input: 'http://example.org/' })).toBe(true);
      expect(ActorHttp.isReplayableRequestBody(<any> { input: 'http://example.org/', init: { body: 'abc' }}))
        .toBe(true);
    });
  });

  describe('isBrowser', () => {
    afterEach(() => {
      delete (<any>globalThis).importScripts;
      delete (<any>globalThis).window;
    });

    it('should return false when neither window nor importScripts are defined', () => {
      expect(globalThis.window).toBeUndefined();
      expect((<any>globalThis).importScripts).toBeUndefined();
      expect(ActorHttp.isBrowser()).toBeFalsy();
    });

    it('should return true when window.document is defined', () => {
      expect(globalThis.window).toBeUndefined();
      expect((<any>globalThis).importScripts).toBeUndefined();
      globalThis.window = <any> { document: {}};
      expect(ActorHttp.isBrowser()).toBeTruthy();
    });

    it('should return true when importScripts is defined', () => {
      expect(globalThis.window).toBeUndefined();
      expect((<any>globalThis).importScripts).toBeUndefined();
      (<any>globalThis).importScripts = () => {};
      expect(ActorHttp.isBrowser()).toBeTruthy();
    });
  });
});
