import { PassThrough } from 'stream';
import type { IActionInit, IActorOutputInit } from '@comunica/bus-init';
import { ActorInit } from '@comunica/bus-init';
import type { IActorArgs, IActorTest } from '@comunica/core';
const stringToStream = require('streamify-string');

/**
 * A Hello World actor that listens on the 'init' bus.
 *
 * It takes an optional `hello` parameter, which defaults to 'Hello'.
 * When run, it will print the `hello` parameter to the console,
 * followed by all arguments it received.
 */
export class ActorInitHelloWorld extends ActorInit implements IActorInitHelloWorldArgs {
  public readonly hello: string;

  public constructor(args: IActorInitHelloWorldArgs) {
    super(args);
    if (!this.hello) {
      this.hello = 'Hello';
    }
  }

  public async test(action: IActionInit): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionInit): Promise<IActorOutputInit> {
    return {
      stderr: new PassThrough(),
      stdout: stringToStream(`${this.hello} ${action.argv.join(' ')}\n`),
    };
  }
}

export interface IActorInitHelloWorldArgs extends IActorArgs<IActionInit, IActorTest, IActorOutputInit> {
  hello: string;
}
