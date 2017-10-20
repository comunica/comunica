import {ActorInit, IActionInit} from "@comunica/bus-init/lib/ActorInit";
import {IActorArgs, IActorTest} from "@comunica/core/lib/Actor";
import {Duplex, PassThrough, Readable} from "stream";
import {IActorOutputInit} from "../../bus-init/lib/ActorInit";

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

  public async run(action: IActionInit): Promise<IActorOutputInit> {
    return {
      stderr: new PassThrough(),
      stdout: this.stringToStream(this.hello + ' ' + action.argv.join(' ') + '\n'),
    };
  }

  protected stringToStream(input: string): Readable {
    const array: string[] = input.split('');
    const readable = new Duplex();
    readable._read = () => {
      readable.push(array.shift());
      if (array.length === 0) {
        readable.push(null);
      }
      return;
    };
    return readable;
  }

}

export interface IActorInitHelloWorldArgs extends IActorArgs<IActionInit, IActorTest, IActorOutputInit> {
  hello: string;
}
