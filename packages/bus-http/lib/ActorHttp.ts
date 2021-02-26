import { KeysHttp } from '@comunica/context-entries';
import type { IAction, IActorArgs, IActorOutput, IActorTest } from '@comunica/core';
import { Actor } from '@comunica/core';

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
  public constructor(args: IActorArgs<IActionHttp, IActorTest, IActorHttpOutput>) {
    super(args);
  }

  /**
   * Converts a WhatWG streams to Node streams if required.
   * Returns the input in case the stream already is a Node stream.
   * @param {ReadableStream} body
   * @returns {NodeJS.ReadableStream}
   */
  public static toNodeReadable(body: ReadableStream | null): NodeJS.ReadableStream {
    return require('is-stream')(body) ? body : require('web-streams-node').toNodeReadable(body);
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

/**
 * @type {string} Context entry for the include credentials flags.
 * @deprecated Import this constant from @comunica/context-entries.
 */
export const KEY_CONTEXT_INCLUDE_CREDENTIALS = KeysHttp.includeCredentials;

/**
 * @type {string} Context entry for the authentication for a source.
 * @value {string} "username:password"-pair.
 * @deprecated Import this constant from @comunica/context-entries.
 */
export const KEY_CONTEXT_AUTH = KeysHttp.auth;
