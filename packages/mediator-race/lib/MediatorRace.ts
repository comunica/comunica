import {Actor, IAction, IActorOutput, IActorReply, IActorTest, IMediatorArgs, Mediator} from "@comunica/core";

/**
 * A mediator that picks the first actor that resolves its test.
 */
export class MediatorRace<A extends Actor<I, T, O>, I extends IAction, T extends IActorTest, O extends IActorOutput>
  extends Mediator<A, I, T, O> {

  constructor(args: IMediatorArgs<A, I, T, O>) {
    super(args);
  }

  protected mediateWith(action: I, testResults: IActorReply<A, I, T, O>[]): Promise<A> {
    return new Promise((resolve, reject) => {
      const errors: Error[] = [];
      for (const testResult of testResults) {
        testResult.reply.then(() => {
          resolve(testResult.actor);
        }).catch((error) => {
          // Reject if all replies were rejected
          errors.push(error);
          if (errors.length === testResults.length) {
            reject(new Error(this.name + ' mediated over all rejecting actors:\n'
              + errors.map((e) => e.toString()).join('\n')));
          }
        });
      }
    });
  }

}
