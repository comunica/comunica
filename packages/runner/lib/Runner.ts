import {ActorInit, IActionInit, IActorOutputInit} from "@comunica/bus-init";
import {Actor, IAction, IActorOutput, IActorTest} from "@comunica/core";
import {Bus, IActorReply} from "@comunica/core";

/**
 * A Runner is used to instantiate a comunica workflow.
 *
 * It is instantiated dynamically using a Components.js config file.
 * A bus and a list of actors are injected into this runner dynamically.
 *
 * The {@link Runner#run} function must be called to instantiate the workflow.
 */
export class Runner implements IRunnerArgs {

  public readonly busInit: Bus<ActorInit, IActionInit, IActorTest, IActorOutputInit>;
  public readonly actors: Actor<IAction, IActorTest, IActorOutput>[];

  constructor(args: IRunnerArgs) {
    require('lodash.assign')(this, args);
    if (!this.busInit) {
      throw new Error('A valid "busInit" argument must be provided.');
    }
    if (!this.actors) {
      throw new Error('A valid "actors" argument must be provided.');
    }
  }

  /**
   * Run a comunica workflow.
   *
   * @param {IActionInit} action An 'init' action.
   * @return {Promise<void>}     A promise that resolves when the init actors are triggered.
   */
  public async run(action: IActionInit): Promise<IActorOutputInit[]> {
    const replies: IActorReply<ActorInit, IActionInit, IActorTest, IActorOutputInit>[] =
      await Promise.all(this.busInit.publish(action));
    return Promise.all(replies.map((reply) => reply.actor.runObservable(action)));
  }

  /**
   * Initialize the actors.
   * This should be used for doing things that take a while,
   * such as opening files.
   *
   * @return {Promise<void>} A promise that resolves when the actors have been initialized.
   */
  public initialize(): Promise<any> {
    return Promise.all(this.actors.map((actor) => actor.initialize())).then(() => true);
  }

  /**
   * Deinitialize the actors.
   * This should be used for cleaning up things when the application is shut down,
   * such as closing files and removing temporary files.
   *
   * @return {Promise<void>} A promise that resolves when the actors have been deinitialized.
   */
  public async deinitialize(): Promise<any> {
    return Promise.all(this.actors.map((actor) => actor.deinitialize())).then(() => true);
  }

  /**
   * Collect the given actors that are available in this runner.
   *
   * Example:
   * <pre>
   *   const { engine } = runner.collectActors({ engine: 'urn:comunica:sparqlinit' };
   *   // engine is an actor instance
   * </pre>
   *
   * An error will be thrown if any of the actors could not be found in the runner.
   *
   * @param actorIdentifiers A mapping of keys to actor identifiers.
   * @return A mapping of keys to actor instances.
   */
  public collectActors(actorIdentifiers: {[key: string]: string})
    : {[key: string]: Actor<IAction, IActorTest, IActorOutput>} {
    const actors: {[key: string]: Actor<IAction, IActorTest, IActorOutput>} = {};

    // Collect all required actors
    for (const key in actorIdentifiers) {
      for (const actor of this.actors) {
        if (actor.name === actorIdentifiers[key]) {
          actors[key] = actor;
        }
      }
    }

    // Error if we are missing actors
    for (const key in actorIdentifiers) {
      if (!(key in actors)) {
        throw new Error(`No actor for key ${key} was found for IRI ${actorIdentifiers[key]}.`);
      }
    }

    return actors;
  }

}

/**
 * The arguments that are passed to a Runner.
 */
export interface IRunnerArgs {
  /**
   * The 'init' event bus.
   */
  busInit: Bus<Actor<IAction, IActorTest, IActorOutput>, IAction, IActorTest, IActorOutput>;
  /**
   * The list of all actors that are part of the comunica workflow.
   */
  actors: Actor<IAction, IActorTest, IActorOutput>[];
}
