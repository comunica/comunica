import {IActionHttp, IActorHttpOutput} from "@comunica/bus-http";
import {ActorInit, IActionInit, IActorOutputInit} from "@comunica/bus-init";
import {Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import {PassThrough} from "stream";

/**
 * A Hello World actor that listens on the 'init' bus.
 *
 * It takes an optional `hello` parameter, which defaults to 'Hello'.
 * When run, it will print the `hello` parameter to the console,
 * followed by all arguments it received.
 */
export class ActorInitHttp extends ActorInit implements IActorInitHelloWorldArgs {

  public readonly mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
    IActionHttp, IActorTest, IActorHttpOutput>;
  public readonly url?: string;
  public readonly method?: string;
  public readonly headers?: string[];

  constructor(args: IActorInitHelloWorldArgs) {
    super(args);
  }

  public async test(action: IActionInit): Promise<IActorTest> {
    return null;
  }

  public async run(action: IActionInit): Promise<IActorOutputInit> {
    const http: IActionHttp = {
      url: action.argv.length > 0 ? action.argv[0] : this.url,
    };
    if (this.method) {
      http.method = this.method;
    }
    if (this.headers) {
      http.headers = this.headers.reduce((headers: {[id: string]: string}, value: string) => {
        const i: number = value.indexOf(':');
        headers[value.substr(0, i)] = value.substr(i);
        return headers;
      }, {});
    }

    const result: IActorHttpOutput = await this.mediatorHttp.mediate(http);
    const output: IActorOutputInit = {};
    if (result.status === 200) {
      output.stdout = result.body.pipe(new PassThrough());
    } else {
      output.stderr = result.body.pipe(new PassThrough());
    }
    return output;
  }

}

export interface IActorInitHelloWorldArgs extends IActorArgs<IActionInit, IActorTest, IActorOutputInit> {
  mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
    IActionHttp, IActorTest, IActorHttpOutput>;
  url?: string;
  method?: string;
  headers?: string[];
}
