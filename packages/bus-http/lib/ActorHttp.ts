import {Actor, IAction, IActorOutput, IActorTest} from "@comunica/core";
import {IActorArgs} from "@comunica/core/lib/Actor";
import {IMediatorTypeTime} from "@comunica/mediatortype-time";
import {Agent} from "http";

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
export abstract class ActorHttp extends Actor<IActionHttp, IActorHttpTest, IActorHttpOutput> {

  constructor(args: IActorArgs<IActionHttp, IActorHttpTest, IActorHttpOutput>) {
    super(args);
  }

}

/**
 * The HTTP input, which contains the HTTP request.
 * This is compatible with the node-fetch RequestInit interface.
 * Based on https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/node-fetch/index.d.ts
 */
export interface IActionHttp extends IAction {
  url: string;

  // whatwg/fetch standard options
  method?: string;
  headers?: IHeaders | string[] | { [index: string]: string };
  body?: BodyInit;
  redirect?: RequestRedirect;

  // node-fetch extensions
  compress?: boolean; // =true support gzip/deflate content encoding. false to disable
  agent?: Agent; // =null http.Agent instance, allows custom proxy, certificate etc.
  follow?: number; // =20 maximum redirect count. 0 to not follow redirect
  timeout?: number; // =0 req/res timeout in ms, it resets on redirect. 0 to disable (OS limit applies)
  size?: number; // =0 maximum response body size in bytes. 0 to disable
}

export type RequestRedirect = "follow" | "error" | "manual";
export type BodyInit = ArrayBuffer | ArrayBufferView | string | NodeJS.ReadableStream;

export interface IHeaders {
  append(name: string, value: string): void;
  delete(name: string): void;
  get(name: string): string;
  getAll(name: string): string[];
  has(name: string): boolean;
  set(name: string, value: string): void;
  forEach(callback: (value: string, name: string) => void): void;
}

/**
 * The HTTP test output.
 */
export interface IActorHttpTest extends IActorTest, IMediatorTypeTime {
  /**
   * An upper bound of the estimated response time.
   * If unknown, this can be Infinity.
   * If the request is for example retrieved from a cache, this can be 0.
   */
  time: number;
}

/**
 * The HTTP output, which contains the HTTP response.
 * This is compatible with the node-fetch Response interface.
 * Based on https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/node-fetch/index.d.ts
 */
export interface IActorHttpOutput extends IActorOutput, IBody {
  type: ResponseType;
  url: string;
  status: number;
  ok: boolean;
  size: number;
  statusText: string;
  timeout: number;
  headers: IHeaders;
}

export type ResponseType = "basic" | "cors" | "default" | "error" | "opaque" | "opaqueredirect";

export interface IBody {
  bodyUsed: boolean;
  body: NodeJS.ReadableStream;
  json(): Promise<any>;
  json<T>(): Promise<T>;
  text(): Promise<string>;
  buffer(): Promise<Buffer>;
}
