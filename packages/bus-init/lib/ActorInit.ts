import {Actor, IAction, IActorOutput, IActorTest} from "@comunica/core";
import {IActorArgs} from "@comunica/core";
import {Readable} from "stream";

/**
 * A base actor for listening to init events.
 *
 * Actor types:
 * * Input:  IActionInit:      Contains process information
 *                             such as the list of arguments,
 *                             environment variables and input stream.
 * * Test:   <none>
 * * Output: IActorOutputInit: Contains process output streams.
 *
 * @see IActionInit
 */
export abstract class ActorInit extends Actor<IActionInit, IActorTest, IActorOutputInit> {

  constructor(args: IActorArgs<IActionInit, IActorTest, IActorOutputInit>) {
    super(args);
  }

}

/**
 * The init input, which contains the program arguments.
 */
export interface IActionInit extends IAction {
  /**
   * The list of program arguments.
   */
  argv: string[];
  /**
   * The mapping of environment variables.
   */
  env: {[id: string]: string};
  /**
   * A standard input stream.
   */
  stdin: Readable;
}

export interface IActorOutputInit extends IActorOutput {
  /**
   * A standard error output stream.
   */
  stderr?: Readable;
  /**
   * A standard output stream.
   */
  stdout?: Readable;
}
