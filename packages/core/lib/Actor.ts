import * as _ from "lodash";
import {Bus} from "./Bus";

/**
 * An actor can act on messages of certain types and provide output of a certain type.
 *
 * The flow of an actor is as follows:
 * 1. Send a message to {@link Actor#test} to test if an actor can run that action.
 * 2. If the actor can reply to the message, let the actor run the action using {@link Actor#run}.
 *
 * An actor is typically subscribed to a bus,
 * using which the applicability to an action can be tested.
 *
 * @see Bus
 *
 * @template I The input type of an actor.
 * @template T The test type of an actor.
 * @template O The output type of an actor.
 */
export abstract class Actor<I extends IAction, T extends IActorTest, O extends IActorOutput>
  implements IActorArgs<I, T, O> {

  public readonly name: string;
  public readonly bus: Bus<Actor<I, T, O>, I, T, O>;

  /**
   * All enumerable properties from the `args` object are inherited to this actor.
   *
   * The actor will subscribe to the given bus when this constructor is called.
   *
   * @param {IActorArgs<I extends IAction, T extends IActorTest, O extends IActorOutput>} args Arguments object
   * @param {string} args.name The name for this actor.
   * @param {Bus<A extends Actor<I, T, O>, I extends IAction, T extends IActorTest, O extends IActorOutput>} args.bus
   *        The bus this actor subscribes to.
   * @throws When required arguments are missing.
   */
  constructor(args: IActorArgs<I, T, O>) {
    _.assign(this, args);
    this.bus.subscribe(this);
  }

  /**
   * Check if this actor can run the given action,
   * without actually running it.
   *
   * @param {I} action The action to test.
   * @return {Promise<T>} A promise that resolves to the test result.
   */
  public abstract async test(action: I): Promise<T>;

  /**
   * Run the given action on this actor.
   *
   * @param {I} action The action to run.
   * @return {Promise<T>} A promise that resolves to the run result.
   */
  public abstract async run(action: I): Promise<O>;

}

export interface IActorArgs<I extends IAction, T extends IActorTest, O extends IActorOutput> {
  name: string;
  bus: Bus<Actor<I, T, O>, I, T, O>;
}

/**
 * Data interface for the type of action.
 */
export interface IAction {

}

/**
 * Data interface for the type of an actor test result.
 */
export interface IActorTest {

}

/**
 * Data interface for the type of an actor run result.
 */
export interface IActorOutput {

}
