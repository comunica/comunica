import {ActionObserver, Actor, IActionObserverArgs, IActorTest} from "@comunica/core";
import {IActionHttp, IActorHttpOutput} from "@comunica/bus-http";

/**
 * Observes HTTP actions, and maintains a counter of the number of requests.
 */
export class ActionObserverHttp extends ActionObserver<IActionHttp, IActorHttpOutput> {

  public requests: number = 0;

  constructor(args: IActionObserverArgs<IActionHttp, IActorHttpOutput>) {
    super(args);
    this.bus.subscribeObserver(this);
  }

  public onRun(actor: Actor<IActionHttp, IActorTest, IActorHttpOutput>, action: IActionHttp, output: Promise<IActorHttpOutput>): void {
    this.requests++;
  }

}
