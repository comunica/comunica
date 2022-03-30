import type {
  IAction,
  IActorTest,
  IActorOutput,
  Actor,
  IActorReply,
  Mediate,
} from '@comunica/core';
import {
  Bus,
} from '@comunica/core';

// Creates a mediator from a single actor
export function createMediator<I extends IAction, T extends IActorTest, O extends IActorOutput>(
  ActorClass: new (args: { name: string; bus: Bus<Actor<I, T, O>, I, T, O> }) => Actor<I, T, O>,
): Mediate<I, O, T> {
  const actor = new ActorClass({
    bus: new Bus({ name: 'bus' }),
    name: 'actor',
  });
  return <Mediate<I, O, T>> {
    async mediate(action) {
      return actor.run(action);
    },
    async mediateActor(action) {
      await actor.test(action);
      return actor;
    },
    publish(action: I): IActorReply<Actor<I, T, O>, I, T, O>[] {
      return [{ actor, reply: actor.test(action) }];
    },
  };
}
