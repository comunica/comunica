import type { IActionHttp, ActorHttp, IActorHttpOutput } from '@comunica/bus-http';
import type { ActorHttpInvalidateListenable } from '@comunica/bus-http-invalidate';
import type { IActionObserverArgs } from '@comunica/core';
import { ActionObserver } from '@comunica/core';

/**
 * Action observer for the HTTP bus, that counts the number of outgoing HTTP requests being produced by the engine.
 */
export class ActionObserverHttpRequests extends ActionObserver<IActionHttp, IActorHttpOutput> {
  private readonly httpInvalidator: ActorHttpInvalidateListenable;
  private readonly actors: Set<ActorHttp>;
  private httpRequests: number;

  public get requests(): number {
    return this.httpRequests;
  }

  public constructor(args: IActionObserverHttpRequestCountArgs) {
    super(args);
    this.httpRequests = 0;
    this.actors = new Set(args.actors);
    this.bus.subscribeObserver(this);
    this.httpInvalidator.addInvalidateListener(() => {
      this.httpRequests = 0;
    });
  }

  public onRun(actor: ActorHttp, _action: IActionHttp, _output: Promise<IActorHttpOutput>): void {
    if (this.actors.has(actor)) {
      this.httpRequests++;
    }
  }
}

export interface IActionObserverHttpRequestCountArgs extends IActionObserverArgs<IActionHttp, IActorHttpOutput> {
  /**
   * An actor that listens to HTTP invalidation events
   */
  httpInvalidator: ActorHttpInvalidateListenable;
  /**
   * The set of actors that make outgoing HTTP requests.
   * Not all actors on the HTTP bus send out HTTP requests.
   */
  actors: ActorHttp[];
}
