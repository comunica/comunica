import {Actor, IAction, IActorOutput, IActorTest} from "./Actor";
import {Bus, IActorReply, IBusArgs} from "./Bus";

/**
 * A bus that indexes identified actors,
 * so that actions with a corresponding identifier can be published more efficiently.
 *
 * Multiple actors with the same identifier can be subscribed.
 *
 * If actors or actions do not have a valid identifier,
 * then this will fallback to the normal bus behaviour.
 *
 * @see Bus
 *
 * @template A The actor type that can subscribe to the sub.
 * @template I The input type of an actor.
 * @template T The test type of an actor.
 * @template O The output type of an actor.
 */
export class BusIndexed<A extends Actor<I, T, O>, I extends IAction, T extends IActorTest, O extends IActorOutput>
  extends Bus<A, I, T, O> {

  protected readonly actorsIndex: {[id: string]: A[]} = {};
  protected readonly actorIdentifierFields: string[];
  protected readonly actionIdentifierFields: string[];

  /**
   * All enumerable properties from the `args` object are inherited to this bus.
   *
   * @param {IBusIndexedArgs} args Arguments object
   * @param {string} args.name The name for the bus
   * @throws When required arguments are missing.
   */
  constructor(args: IBusIndexedArgs) {
    super(args);
  }

  public subscribe(actor: A) {
    const actorId = this.getActorIdentifier(actor) || '_undefined_';
    let actors = this.actorsIndex[actorId];
    if (!actors) {
      actors = this.actorsIndex[actorId] = [];
    }
    actors.push(actor);
    super.subscribe(actor);
  }

  public unsubscribe(actor: A): boolean {
    const actorId = this.getActorIdentifier(actor) || '_undefined_';
    const actors = this.actorsIndex[actorId];
    if (actors) {
      const i = actors.indexOf(actor);
      if (i >= 0) {
        actors.splice(i, 1);
      }
      if (actors.length === 0) {
        delete this.actorsIndex[actorId];
      }
    }
    return super.unsubscribe(actor);
  }

  public publish(action: I): IActorReply<A, I, T, O>[] {
    const actionId = this.getActionIdentifier(action);
    if (actionId) {
      const actors = (this.actorsIndex[actionId] || []).concat(this.actorsIndex._undefined_ || []);
      return actors.map((actor: A) => {
        return { actor, reply: actor.test(action) };
      });
    } else {
      return super.publish(action);
    }
  }

  protected getActorIdentifier(actor: A): string {
    return this.actorIdentifierFields.reduce((object: any, field) => object[field], actor);
  }

  protected getActionIdentifier(action: I): string {
    return this.actionIdentifierFields.reduce((object: any, field) => object[field], action);
  }

}

export interface IBusIndexedArgs extends IBusArgs {
  actorIdentifierFields: string[];
  actionIdentifierFields: string[];
}
