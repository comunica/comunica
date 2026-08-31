import { stringify as stringifyStream } from '@jeswr/stream-to-string';
import { PassThrough, Readable } from 'readable-stream';
import { ActorHttp } from '../lib/ActorHttp';
import 'cross-fetch/polyfill';

const readableToWeb = require('readable-stream-node-to-web');

describe('ActorHttp', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

  describe('toNodeReadableForwardingErrors', () => {
    it('should handle WHATWG ReadableStream', async() => {
      const whatwgReadableStream = readableToWeb(Readable.from([ 'CONTENT' ]));
      const stream = ActorHttp.toNodeReadableForwardingErrors(whatwgReadableStream);
      expect(stream).toBeInstanceOf(Readable);
      await expect(stringifyStream(stream)).resolves.toBe('CONTENT');
    });

    it('should forward errors to the streams it is piped into', async() => {
      const source = new Readable({ read: () => {} });
      const stream = ActorHttp.toNodeReadableForwardingErrors(<any> source);
      const destinations = [ new PassThrough(), new PassThrough() ];
      const errors = destinations.map((destination) => {
        stream.pipe(destination);
        return new Promise(resolve => destination.on('error', resolve));
      });

      const error = new Error('Error in toNodeReadableForwardingErrors');
      source.emit('error', error);

      await expect(Promise.all(errors)).resolves.toEqual([ error, error ]);
    });

    it('should not forward errors that are handled by another listener', async() => {
      const source = new Readable({ read: () => {} });
      const stream = ActorHttp.toNodeReadableForwardingErrors(<any> source);
      const destination = new PassThrough();
      stream.pipe(destination);
      destination.on('error', () => {
        throw new Error('The error should not have been forwarded');
      });
      const handled = new Promise(resolve => stream.on('error', resolve));

      const error = new Error('Error in toNodeReadableForwardingErrors');
      source.emit('error', error);

      await expect(handled).resolves.toBe(error);
    });

    it('should not forward errors when the stream is not piped anywhere', () => {
      const source = new Readable({ read: () => {} });
      ActorHttp.toNodeReadableForwardingErrors(<any> source);
      expect(source.listenerCount('error')).toBe(0);
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
      jest.spyOn(ActorHttp, 'isBrowser').mockReturnValue(true);
      expect(ActorHttp.createUserAgent(actorName, actorVersion)).toBeUndefined();
    });

    it('should construct custom agent from navigator.userAgent in non-browser environments', () => {
      expect(globalThis.window).toBeUndefined();
      expect(globalThis.process).toBeUndefined();
      expect(globalThis.navigator).toBeUndefined();
      jest.spyOn(ActorHttp, 'isBrowser').mockReturnValue(false);
      globalThis.navigator = <any>{ userAgent: 'Runtime/2.3.4' };
      const userAgent = ActorHttp.createUserAgent(actorName, actorVersion);
      expect(userAgent).toBeDefined();
      expect(userAgent).toMatch(/^Comunica\/1.0 ActorHttp\/1.2.3 Runtime\/2.3.4$/u);
    });

    it('should construct custom agent from navigator.userAgent in non-browser environments with platform data', () => {
      expect(globalThis.window).toBeUndefined();
      expect(globalThis.navigator).toBeUndefined();
      jest.spyOn(ActorHttp, 'isBrowser').mockReturnValue(false);
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
      jest.spyOn(ActorHttp, 'isBrowser').mockReturnValue(false);
      globalThis.process = <any>{ versions: { node: '20.3.4' }};
      const userAgent = ActorHttp.createUserAgent(actorName, actorVersion);
      expect(userAgent).toBeDefined();
      expect(userAgent).toMatch(/^Comunica\/1.0 ActorHttp\/1.2.3 Node.js\/20$/u);
    });

    it('should construct custom agent without runtime info when neither navigator nor process are defined', () => {
      expect(globalThis.window).toBeUndefined();
      expect(globalThis.process).toBeUndefined();
      expect(globalThis.navigator).toBeUndefined();
      jest.spyOn(ActorHttp, 'isBrowser').mockReturnValue(false);
      const userAgent = ActorHttp.createUserAgent(actorName, actorVersion);
      expect(userAgent).toBeDefined();
      expect(userAgent).toMatch(/^Comunica\/1.0 ActorHttp\/1.2.3$/u);
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
