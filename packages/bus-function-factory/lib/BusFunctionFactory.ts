import type { IActorReply, IActorTest, IBusArgs } from '@comunica/core';
import { Bus } from '@comunica/core';
import type { ActorFunctionFactory, IActionFunctionFactory, IActorFunctionFactoryOutput } from './ActorFunctionFactory';

/**
 * Bus inspired by BusIndexed but specific for function factory.
 *
 * The implementation differs. In BusIndexed, each actor is indexed only once.
 * Here, a single actor can be indexed multiple times (max 2).
 */
export class BusFunctionFactory
  extends Bus<ActorFunctionFactory, IActionFunctionFactory, IActorTest, IActorFunctionFactoryOutput> {
  protected readonly actorsIndex: Record<string, ActorFunctionFactory[]> = {};
  protected readonly actorIdentifierFields: string[];
  protected readonly actionIdentifierFields: string[];

  public constructor(args: IBusArgs) {
    super(args);
  }

  public override subscribe(actor: ActorFunctionFactory): void {
    for (const actorId of this.getActorIdentifiers(actor)) {
      let actors = this.actorsIndex[actorId];
      if (!actors) {
        actors = this.actorsIndex[actorId] = [];
      }
      actors.push(actor);
      super.subscribe(actor);
    }
  }

  public override unsubscribe(actor: ActorFunctionFactory): boolean {
    let unsubscribed = true;
    for (const actorId of this.getActorIdentifiers(actor)) {
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
      unsubscribed = unsubscribed && super.unsubscribe(actor);
    }
    return unsubscribed;
  }

  public override publish(action: IActionFunctionFactory):
  IActorReply<ActorFunctionFactory, IActionFunctionFactory, IActorTest, IActorFunctionFactoryOutput>[] {
    const actionId = this.getActionIdentifier(action);
    if (actionId) {
      const actors = [ ...this.actorsIndex[actionId] || [], ...this.actorsIndex._undefined_ || [] ];
      return actors.map((actor: ActorFunctionFactory):
      IActorReply<ActorFunctionFactory, IActionFunctionFactory, IActorTest, IActorFunctionFactoryOutput> =>
        ({ actor, reply: actor.test(action) }));
    }
    return super.publish(action);
  }

  protected getActorIdentifiers(actor: any): string[] {
    const functionNames: any = actor.functionNames;
    const termFunction: any = actor.termFunction;
    if (Array.isArray(functionNames)) {
      const result = [];
      for (const functionName of functionNames) {
        result.push(`${String(functionName)} ; false`);
        if (termFunction === true) {
          result.push(`${String(functionName)} ; true`);
        }
      }
      return result;
    }
    return [ '_undefined_' ];
  }

  protected getActionIdentifier(action: IActionFunctionFactory): string {
    return `${action.functionName} ; ${action.requireTermExpression ?? false}`;
  }
}
