import {ActorInit, IActionInit} from "@comunica/bus-init/lib/ActorInit";
import {IActorArgs, IActorOutput, IActorTest} from "@comunica/core/lib/Actor";

/**
 * A Hello World actor that listens to on the 'init' bus.
 *
 * It takes an optional `hello` parameter, which defaults to 'Hello'.
 * When run, it will print the `hello` parameter to the console,
 * followed by all arguments it received.
 */
export class ActorInitHelloWorld extends ActorInit implements IActorInitHelloWorldArgs {

  public readonly hello: string;

  constructor(args: IActorInitHelloWorldArgs) {
    super(args);
    if (!this.hello) {
      this.hello = 'Hello';
    }
  }

  public async test(action: IActionInit): Promise<IActorTest> {
    return null;
  }

  public async run(action: IActionInit): Promise<IActorOutput> {
    console.log(this.hello + ' ' + action.argv.join(' '));
    return null;
  }

}

export interface IActorInitHelloWorldArgs extends IActorArgs<IActionInit, IActorTest, IActorOutput> {
  hello: string;
}
