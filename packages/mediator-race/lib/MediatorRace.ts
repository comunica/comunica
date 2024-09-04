import type {
  Actor,
  IAction,
  IActorOutput,
  IActorReply,
  IActorTest,
  IMediatorArgs,
  TestResult,
} from '@comunica/core';
import { failTest, passTest, Mediator } from '@comunica/core';

/**
 * A mediator that picks the first actor that resolves its test.
 */
export class MediatorRace<A extends Actor<I, T, O>, I extends IAction, T extends IActorTest, O extends IActorOutput>
  extends Mediator<A, I, T, O> {
  public constructor(args: IMediatorArgs<A, I, T, O>) {
    super(args);
  }

  protected mediateWith(action: I, testResults: IActorReply<A, I, T, O>[]): Promise<TestResult<A>> {
    return new Promise((resolve, reject) => {
      const errors: string[] = [];
      for (const testResult of testResults) {
        testResult.reply.then((reply) => {
          if (reply.isPassed()) {
            resolve(passTest(testResult.actor));
          } else {
            errors.push(reply.getFailMessage());
            if (errors.length === testResults.length) {
              resolve(failTest(`${this.name} mediated over all rejecting actors:\n${
                  errors.join('\n')}`));
            }
          }
        }).catch((error) => {
          reject(error);
        });
      }
    });
  }
}
