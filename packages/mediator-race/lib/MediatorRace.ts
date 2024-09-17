import type {
  Actor,
  IAction,
  IActorOutput,
  IActorReply,
  IActorTest,
  IMediatorArgs,
  TestResult,
} from '@comunica/core';
import { passTestWithSideData, failTest, Mediator } from '@comunica/core';

/**
 * A mediator that picks the first actor that resolves its test.
 */
export class MediatorRace<
  A extends Actor<I, T, O, TS>,
I extends IAction,
T extends IActorTest,
O extends IActorOutput,
TS = undefined,
>
  extends Mediator<A, I, T, O, TS> {
  public constructor(args: IMediatorArgs<A, I, T, O, TS>) {
    super(args);
  }

  protected mediateWith(action: I, testResults: IActorReply<A, I, T, O, TS>[]): Promise<TestResult<A, TS>> {
    return new Promise((resolve, reject) => {
      const errors: string[] = [];
      for (const testResult of testResults) {
        testResult.reply.then((reply) => {
          if (reply.isPassed()) {
            resolve(passTestWithSideData(testResult.actor, reply.getSideData()));
          } else {
            errors.push(reply.getFailMessage());
            if (errors.length === testResults.length) {
              resolve(failTest(this.constructFailureMessage(action, errors)));
            }
          }
        }).catch((error) => {
          reject(error);
        });
      }
    });
  }
}
