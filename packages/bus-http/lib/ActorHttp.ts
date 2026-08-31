import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { ICachePolicy } from '@comunica/types';
import { readableFromWeb } from 'readable-from-web';

const isStream = require('is-stream');
const toWebReadableStream = require('readable-stream-node-to-web');

/**
 * A base actor for listening to HTTP events.
 *
 * Actor types:
 * * Input:  IActionHttp:      The HTTP request.
 * * Test:   IActorHttpTest:   An estimate for the response time.
 * * Output: IActorHttpOutput: The HTTP response.
 *
 * @see IActionHttp
 * @see IActorHttpTest
 * @see IActorHttpOutput
 */
export abstract class ActorHttp<TS = undefined> extends Actor<IActionHttp, IActorTest, IActorHttpOutput, TS> {
  /* eslint-disable max-len */
  /**
   * @param args -
   *   \ @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   *   \ @defaultNested {HTTP request failed: none of the configured actors were able to handle ${action.input}} busFailMessage
   */
  /* eslint-enable max-len */
  public constructor(args: IActorHttpArgs<TS>) {
    super(args);
  }

  /**
   * Converts WhatWG streams to Node streams if required.
   * Returns the input in case the stream already is a Node stream.
   * @param {ReadableStream} body
   * @returns {NodeJS.ReadableStream} A node stream.
   */
  public static toNodeReadable(body: ReadableStream | null): NodeJS.ReadableStream {
    return isStream(body) || body === null ?
      <NodeJS.ReadableStream> <any> body :
      <NodeJS.ReadableStream> <any> readableFromWeb(body);
  }

  /**
   * Converts WhatWG streams to Node streams if required, just like {@link ActorHttp.toNodeReadable},
   * with the addition that unhandled errors are forwarded to the streams this stream is piped into.
   *
   * Node.js's `pipe` does not forward errors to the destination stream.
   * Since consumers of HTTP response bodies commonly pipe them into a parser,
   * and only listen for errors on that parser,
   * errors on the body itself (such as an endpoint dropping the connection halfway through the response)
   * would otherwise be emitted on a stream without any listeners, which crashes the process.
   *
   * Consumers that do listen for errors on the body handle those errors themselves,
   * so the error is only forwarded if no other error listeners are attached to the body.
   * @param {ReadableStream} body A WhatWG stream.
   * @returns {NodeJS.ReadableStream} A node stream that forwards its errors to its pipe destinations.
   */
  public static toNodeReadableForwardingErrors(body: ReadableStream): NodeJS.ReadableStream {
    const stream = ActorHttp.toNodeReadable(body);
    const destinations: NodeJS.WritableStream[] = [];
    const pipeOriginal = stream.pipe.bind(stream);
    stream.pipe = <T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean }): T => {
      if (destinations.length === 0) {
        stream.on('error', (error: Error) => {
          // This listener is included in the count, so a higher count means the error is handled elsewhere.
          if (stream.listenerCount('error') === 1) {
            for (const dest of destinations) {
              dest.emit('error', error);
            }
          }
        });
      }
      destinations.push(destination);
      return pipeOriginal(destination, options);
    };
    return stream;
  }

  /**
   * Converts Node streams to WhatWG streams.
   * @param {NodeJS.ReadableStream} body
   * @returns {ReadableStream} A web stream.
   */
  public static toWebReadableStream(body: NodeJS.ReadableStream | null): ReadableStream {
    return toWebReadableStream(body);
  }

  /**
   * Convert the given headers object into a raw hash.
   * @param headers A headers object.
   */
  public static headersToHash(headers: Headers): Record<string, string> {
    const hash: Record<string, string> = {};
    // eslint-disable-next-line unicorn/no-array-for-each
    headers.forEach((value, key) => {
      hash[key] = value;
    });
    return hash;
  }

  /**
   * Extract the requested URL from the action input.
   * @param {RequestInfo | URL} input The request input.
   * @returns {URL} The extracted URL.
   */
  public static getInputUrl(input: RequestInfo | URL): URL {
    return new URL(input instanceof Request ? input.url : input);
  }

  /**
   * Creates an appropriate User-Agent header string for Node.js or other environments.
   * Within browsers, returns undefined, because the value should not be overridden due to potential CORS issues.
   */
  public static createUserAgent(actorName: string, actorVersion: string): string | undefined {
    if (!ActorHttp.isBrowser()) {
      const versions = [
        `Comunica/${actorVersion.split('.')[0]}.0`,
        `${actorName}/${actorVersion}`,
      ];

      if (typeof globalThis.navigator === 'object' && typeof globalThis.navigator.userAgent === 'string') {
        // Most runtimes like Node.js 21+, Deno and Bun implement navigator.userAgent
        versions.push(globalThis.navigator.userAgent);
      } else if (
        typeof globalThis.process === 'object' &&
        typeof globalThis.process.versions === 'object' &&
        typeof globalThis.process.versions.node === 'string'
      ) {
        // TODO: remove this entire 'else if' when support for Node.js 20 is dropped, this only exists for that one
        versions.push(`Node.js/${globalThis.process.versions.node.split('.')[0]}`);
      }

      if (
        typeof globalThis.process === 'object' &&
        typeof globalThis.process.platform === 'string' &&
        typeof globalThis.process.arch === 'string'
      ) {
        versions.splice(1, 0, `(${globalThis.process.platform}; ${globalThis.process.arch})`);
      }

      return versions.join(' ');
    }
  }

  /**
   * Attempts to determine whether the current environment is a browser or not.
   * @returns {boolean} True for browsers and web workers, false for other runtimes.
   */
  public static isBrowser(): boolean {
    return (
      // The window global and the document are available in browsers, but not in web workers
      // https://developer.mozilla.org/en-US/docs/Glossary/Global_object
      (typeof globalThis.window === 'object' && typeof globalThis.window.document === 'object') ||
      // The importScripts function is only available in Web Workers
      // https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope/importScripts
      (typeof (<any>globalThis).importScripts === 'function')
    );
  }
}

/**
 * The HTTP input, which contains the HTTP request.
 */
export interface IActionHttp extends IAction {
  input: RequestInfo;
  init?: RequestInit;
}

/**
 * The HTTP output, which contains the HTTP response.
 */
export interface IActorHttpOutput extends IActorOutput, Response {
  /**
   * The cache policy of the request's response.
   * This can be used to check if the given response is still valid for another request later on.
   */
  cachePolicy?: ICachePolicy<IActionHttp>;
  /**
   * If the response was served from cache.
   */
  fromCache?: boolean;
}

export type IActorHttpArgs<TS = undefined> = IActorArgs<IActionHttp, IActorTest, IActorHttpOutput, TS>;

export type MediatorHttp = Mediate<IActionHttp, IActorHttpOutput>;
