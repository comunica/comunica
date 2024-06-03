import { Actor, IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';

/**
 * A comunica actor for path-querying events.
 *
 * Actor types:
 * * Input:  IActionPathQuerying:      TODO: fill in.
 * * Test:   <none>
 * * Output: IActorPathQueryingOutput: TODO: fill in.
 *
 * @see IActionPathQuerying
 * @see IActorPathQueryingOutput
 */
export abstract class ActorPathQuerying extends Actor<IActionPathQuerying, IActorTest, IActorPathQueryingOutput> {
  /**
  * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
  */
  public constructor(args: IActorPathQueryingArgs) {
    super(args);
  }
}

export interface IActionPathQuerying extends IAction {

}

export interface IActorPathQueryingOutput extends IActorOutput {

}

export type IActorPathQueryingArgs = IActorArgs<
IActionPathQuerying, IActorTest, IActorPathQueryingOutput>;

export type MediatorPathQuerying = Mediate<
IActionPathQuerying, IActorPathQueryingOutput>;
