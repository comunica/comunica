import type { Actor, IAction, IActorOutput, IActorTest } from './Actor';
import type { IActorReply, IBusArgs } from './Bus';
import { Bus } from './Bus';

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
export class BusIndexed<A extends Actor<I, T, O, any>, I extends IAction, T extends IActorTest, O extends IActorOutput>
  extends Bus<A, I, T, O> {
  protected readonly actorsIndex: Record<string, A[]> = {};
  /**
   * The actors to publish to per action identifier: the actors indexed under that identifier,
   * followed by the actors that have no identifier.
   */
  protected readonly actorsIndexMerged: Record<string, A[]> = {};
  /**
   * The subscribed actors, with one entry per `subscribe` call.
   * This is separate from `actors`, which holds one entry per identifier of each subscribed actor.
   */
  protected readonly actorsSubscribed: A[] = [];
  /**
   * Whether `actorsIndex` currently reflects the subscribed actors.
   */
  protected actorsIndexed = false;
  protected readonly actorIdentifierFields: string[];
  protected readonly actionIdentifierFields: string[];

  /**
   * All enumerable properties from the `args` object are inherited to this bus.
   *
   * @param {IBusIndexedArgs} args Arguments object
   * @param {string} args.name The name for the bus
   * @throws When required arguments are missing.
   */
  public constructor(args: IBusIndexedArgs) {
    super(args);
    this.actorIdentifierFields = args.actorIdentifierFields;
    this.actionIdentifierFields = args.actionIdentifierFields;
  }

  public override subscribe(actor: A): void {
    const actorIds = this.getActorIdentifiers(actor) ?? [ '_undefined_' ];
    for (const _actorId of actorIds) {
      super.subscribe(actor);
    }
    this.actorsSubscribed.push(actor);
    this.invalidateActorsIndex();
  }

  public override unsubscribe(actor: A): boolean {
    const actorIds = this.getActorIdentifiers(actor) ?? [ '_undefined_' ];
    let unsubscribed = false;
    for (const _actorId of actorIds) {
      unsubscribed = unsubscribed || super.unsubscribe(actor);
    }
    const i = this.actorsSubscribed.indexOf(actor);
    if (i >= 0) {
      this.actorsSubscribed.splice(i, 1);
    }
    this.invalidateActorsIndex();
    return unsubscribed;
  }

  public override publish(action: I): IActorReply<A, I, T, O>[] {
    const actionId = this.getActionIdentifier(action);
    if (actionId) {
      const actors = this.getActorsForIdentifier(actionId);
      return actors.map((actor: A): IActorReply<A, I, T, O> => ({ actor, reply: actor.test(action) }));
    }
    return super.publish(action);
  }

  /**
   * Mark the index as out of date, so that it is rebuilt when it is next needed.
   */
  protected invalidateActorsIndex(): void {
    this.actorsIndexed = false;
    for (const key of Object.keys(this.actorsIndex)) {
      delete this.actorsIndex[key];
    }
    for (const key of Object.keys(this.actorsIndexMerged)) {
      delete this.actorsIndexMerged[key];
    }
  }

  /**
   * Obtain the actors that an action with the given identifier must be published to.
   * @param actionId An action identifier.
   */
  protected getActorsForIdentifier(actionId: string): A[] {
    if (!this.actorsIndexed) {
      this.buildActorsIndex();
    }
    let actors = this.actorsIndexMerged[actionId];
    if (!actors) {
      const identified = this.actorsIndex[actionId];
      const unidentified = this.actorsIndex._undefined_;
      if (identified) {
        actors = unidentified ? [ ...identified, ...unidentified ] : identified;
      } else {
        actors = unidentified ?? [];
      }
      this.actorsIndexMerged[actionId] = actors;
    }
    return actors;
  }

  /**
   * Index the subscribed actors by their identifiers.
   *
   * Actors subscribe to their bus from the `Actor` constructor, before subclass constructors have assigned
   * the fields that identify them. Their identifiers are therefore only read here, on first use, at which
   * point every actor is fully constructed.
   */
  protected buildActorsIndex(): void {
    for (const actor of this.actorsSubscribed) {
      for (const actorId of this.getActorIdentifiers(actor) ?? [ '_undefined_' ]) {
        let actors = this.actorsIndex[actorId];
        if (!actors) {
          actors = this.actorsIndex[actorId] = [];
        }
        actors.push(actor);
      }
    }
    this.actorsIndexed = true;
  }

  protected getActorIdentifiers(actor: A): string[] | undefined {
    const identifierValue = <string | string[] | undefined> this.actorIdentifierFields
      .reduce((object: any, field): A => object[field], actor);
    if (!identifierValue) {
      return;
    }
    return Array.isArray(identifierValue) ? identifierValue : [ identifierValue ];
  }

  protected getActionIdentifier(action: I): string {
    return this.actionIdentifierFields.reduce((object: any, field): A => object[field], action);
  }
}

export interface IBusIndexedArgs extends IBusArgs {
  /**
   * Keys to follow down from the actor object.
   * The value at the location following these keys should be a string, a string array, or undefined.
   * If the value is a string array, all strings will be registered as keys that map to the actor.
   */
  actorIdentifierFields: string[];
  /**
   * Keys to follow down from the action object.
   * The value at the location following these keys should be a string or be undefined.
   */
  actionIdentifierFields: string[];
}
