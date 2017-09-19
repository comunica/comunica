import {Actor, IAction, IActorOutput, IActorTest} from "@comunica/core";
import {IActorArgs} from "@comunica/core/lib/Actor";

/**
 * A base actor for listening to init events.
 *
 * Actor types:
 * * Input:  IActionInit: Contains process information
 *                        such as the list of arguments
 *                        and environment variables.
 * * Test:   <none>
 * * Output: <none>
 *
 * @see IActionInit
 */
export abstract class ActorInit extends Actor<IActionInit, IActorTest, IActorOutput> {

  constructor(args: IActorArgs<IActionInit, IActorTest, IActorOutput>) {
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
}
