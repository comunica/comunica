import {Actor, IAction, IActorOutput, IActorReply, IActorTest, IMediatorArgs, Mediator} from "@comunica/core";

/**
 * A mediator that picks the first actor that resolves its test.
 */
export class MediatorRace<A extends Actor<I, T, O>, I extends IAction, T extends IActorTest, O extends IActorOutput>
  extends Mediator<A, I, T, O> {

  constructor(args: IMediatorArgs<A, I, T, O>) {
    super(args);
  }

  protected async mediateWith(action: I, testResults: IActorReply<A, I, T, O>[]): Promise<A> {
    return await Promise.race(testResults.map((testResult) => testResult.reply.then(() => testResult.actor)));
  }

}
