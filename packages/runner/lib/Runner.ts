import type { ActorInit, IActionInit, IActorOutputInit } from '@comunica/bus-init';
import type { Actor, Bus, IAction, IActorOutput, IActorReply, IActorTest } from '@comunica/core';

/**
 * A Runner is used to instantiate a comunica workflow.
 *
 * It is instantiated dynamically using a Components.js config file.
 * A bus and a list of actors are injected into this runner dynamically.
 *
 * The {@link Runner#run} function must be called to instantiate the workflow.
 */
export class Runner {
  /* eslint-disable max-len */
  /**
   * @param busInit - The 'init' event bus. @default {<npmd:@comunica/bus-init/^5.0.0/components/ActorInit.jsonld#ActorInit_default_bus>}
   * @param actors - The list of all actors that are part of the comunica workflow.
   */
  public constructor(
    public readonly busInit: Bus<Actor<IAction, IActorTest, IActorOutput, any>, IAction, IActorTest, IActorOutput, any>,
    public readonly actors: Actor<IAction, IActorTest, IActorOutput, any>[],
  ) {
    if (!this.busInit) {
      throw new Error('A valid "busInit" argument must be provided.');
    }
    if (!this.actors) {
      throw new Error('A valid "actors" argument must be provided.');
    }
  }
  /* eslint-enable max-len */

  /**
   * Run a comunica workflow.
   *
   * @param {IActionInit} action An 'init' action.
   * @return {Promise<void>}     A promise that resolves when the init actors are triggered.
   */
  public async run(action: IActionInit): Promise<IActorOutputInit[]> {
    const replies: IActorReply<ActorInit, IActionInit, IActorTest, IActorOutputInit, any>[] =
      await Promise.all(this.busInit.publish(action));
    // eslint-disable-next-line unicorn/no-useless-undefined
    return Promise.all(replies.map(reply => reply.actor.runObservable(action, undefined)));
  }

  /**
   * Collect the given actors that are available in this runner.
   *
   * Example:
   * <pre>
   *   const { engine } = runner.collectActors({ engine: 'urn:comunica:default:init/actors#query' };
   *   // engine is an actor instance
   * </pre>
   *
   * An error will be thrown if any of the actors could not be found in the runner.
   *
   * @param actorIdentifiers A mapping of keys to actor identifiers.
   * @return A mapping of keys to actor instances.
   */
  public collectActors(actorIdentifiers: Record<string, string>):
  Record<string, Actor<IAction, IActorTest, IActorOutput, any>> {
    const actors: Record<string, Actor<IAction, IActorTest, IActorOutput, any>> = {};

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
