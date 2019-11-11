import {ActorHttp, IActionHttp, IActorHttpOutput} from "@comunica/bus-http";
import {ActorInit, IActionInit, IActorOutputInit} from "@comunica/bus-init";
import {Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import {PassThrough} from "stream";

/**
 * A http actor that listens on the 'init' bus.
 *
 * It will call `this.mediatorHttp.mediate`.
 */
export class ActorInitHttp extends ActorInit implements IActorInitHttpArgs {

  public readonly mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
    IActionHttp, IActorTest, IActorHttpOutput>;
  public readonly url?: string;
  public readonly method?: string;
  public readonly headers?: string[];

  constructor(args: IActorInitHttpArgs) {
    super(args);
  }

  public async test(action: IActionInit): Promise<IActorTest> {
    return null;
  }

  public async run(action: IActionInit): Promise<IActorOutputInit> {
    const http: IActionHttp = {
      context: action.context,
      init: {},
      input: action.argv.length > 0 ? action.argv[0] : this.url,
    };
    if (this.method) {
      http.init.method = this.method;
    }
    if (this.headers) {
      const headers: Headers = new Headers();
      for (const value of this.headers) {
        const i: number = value.indexOf(':');
        headers.append(value.substr(0, i).toLowerCase(), value.substr(i + 2));
      }
      http.init.headers = headers;
    }

    const httpResponse: IActorHttpOutput = await this.mediatorHttp.mediate(http);
    const output: IActorOutputInit = {};
    // Wrap WhatWG readable stream into a Node.js readable stream
    // If the body already is a Node.js stream (in the case of node-fetch), don't do explicit conversion.
    const responseStream: NodeJS.ReadableStream = ActorHttp.toNodeReadable(httpResponse.body);
    if (httpResponse.status === 200) {
      output.stdout = responseStream.pipe(new PassThrough());
    } else {
      output.stderr = responseStream.pipe(new PassThrough());
    }
    return output;
  }

}

export interface IActorInitHttpArgs extends IActorArgs<IActionInit, IActorTest, IActorOutputInit> {
  mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
    IActionHttp, IActorTest, IActorHttpOutput>;
  url?: string;
  method?: string;
  headers?: string[];
}
