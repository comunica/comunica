import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { Readable } from 'readable-stream';
import { ReadableWebToNodeStream } from 'readable-web-to-node-stream';

// TODO: Remove when targeting NodeJS 18+
global.ReadableStream = global.ReadableStream || require('web-streams-ponyfill').ReadableStream;

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
export abstract class ActorHttp extends Actor<IActionHttp, IActorTest, IActorHttpOutput> {
  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorHttpArgs) {
    super(args);
  }

  /**
   * Converts WhatWG streams to Node streams if required.
   * Returns the input in case the stream already is a Node stream.
   * @param {ReadableStream} body
   * @returns {NodeJS.ReadableStream}
   */
  public static toNodeReadable(body: ReadableStream | null): NodeJS.ReadableStream {
    return isStream(body) || body === null ?
      <NodeJS.ReadableStream> <any> body :
      <NodeJS.ReadableStream> <any> new ReadableWebToNodeStream(body);
  }

  /**
   * Converts Node streams to WhatWG streams.
   * @param {NodeJS.ReadableStream} body
   * @returns {ReadableStream}
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
    headers.forEach((value, key) => {
      hash[key] = value;
    });
    return hash;
  }

  /**
   * Normalize the response body by adding methods to it if they are missing
   * @param body The response body
   * @param requestTimeout Optional timeout used for the cancel funtion
   */
  public static normalizeResponseBody(body?: Response['body'], requestTimeout?: NodeJS.Timeout): void {
    // Node-fetch does not support body.cancel, while it is mandatory according to the fetch and readablestream api.
    // If it doesn't exist, we monkey-patch it.
    if (body && !body.cancel) {
      body.cancel = async(error?: Error) => {
        (<Readable><any>body).destroy(error);
        if (requestTimeout !== undefined) {
          // We make sure to remove the timeout if it is still enabled
          clearTimeout(requestTimeout);
        }
      };
    }

    // Node-fetch does not support body.tee, while it is mandatory according to the fetch and readablestream api.
    // If it doesn't exist, we monkey-patch it.
    if (body && !body.tee) {
      body.tee = (): [ReadableStream, ReadableStream] => {
        // eslint-disable-next-line import/no-nodejs-modules
        const stream = require('stream');
        const stream1 = (<Readable><any> body).pipe(new stream.PassThrough());
        const stream2 = (<Readable><any> body).pipe(new stream.PassThrough());
        return [ stream1, stream2 ];
      };
    }
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

}

export type IActorHttpArgs = IActorArgs<IActionHttp, IActorTest, IActorHttpOutput>;

export type MediatorHttp = Mediate<IActionHttp, IActorHttpOutput>;
