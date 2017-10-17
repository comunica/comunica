import {IActionHttp, IActorHttpOutput, IActorHttpTest} from "@comunica/bus-http";
import {ActorInit, IActionInit} from "@comunica/bus-init/lib/ActorInit";
import {Actor, Mediator} from "@comunica/core";
import {IActorArgs, IActorOutput, IActorTest} from "@comunica/core/lib/Actor";

/**
 * A Hello World actor that listens to on the 'init' bus.
 *
 * It takes an optional `hello` parameter, which defaults to 'Hello'.
 * When run, it will print the `hello` parameter to the console,
 * followed by all arguments it received.
 */
export class ActorInitHttp extends ActorInit implements IActorInitHelloWorldArgs {

  public readonly mediatorHttp: Mediator<Actor<IActionHttp, IActorHttpTest, IActorHttpOutput>,
    IActionHttp, IActorHttpTest, IActorHttpOutput>;
  public readonly url?: string;
  public readonly method?: string;
  public readonly headers?: string[];

  constructor(args: IActorInitHelloWorldArgs) {
    super(args);
    if (!this.mediatorHttp) {
      throw new Error('A valid "mediatorHttp" argument must be provided.');
    }
  }

  public async test(action: IActionInit): Promise<IActorTest> {
    return null;
  }

  public async run(action: IActionInit): Promise<IActorOutput> {
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
    result.body.pipe(result.status === 200 ? process.stdout : process.stderr);
    return null;
  }

}

export interface IActorInitHelloWorldArgs extends IActorArgs<IActionInit, IActorTest, IActorOutput> {
  mediatorHttp: Mediator<Actor<IActionHttp, IActorHttpTest, IActorHttpOutput>,
    IActionHttp, IActorHttpTest, IActorHttpOutput>;
  url?: string;
  method?: string;
  headers?: string[];
}
