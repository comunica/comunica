import type { IActionHttp, IActorHttpOutput } from '@comunica/bus-http';
import type { ActorHttpInvalidateListenable } from '@comunica/bus-http-invalidate';
import type { Actor, IActionObserverArgs, IActorTest } from '@comunica/core';
import { ActionObserver } from '@comunica/core';

/**
 * Observes HTTP actions, and maintains a counter of the number of requests.
 */
export class ActionObserverHttp extends ActionObserver<IActionHttp, IActorHttpOutput> {
  public readonly httpInvalidator: ActorHttpInvalidateListenable;
  public requests = 0;

  /* eslint-disable max-len */
  /**
   * @param args - @defaultNested {<npmd:@comunica/bus-http/^2.0.0/components/ActorHttp.jsonld#ActorHttp_default_bus>} bus
   */
  public constructor(args: IActionObserverHttpArgs) {
    super(args);
    this.bus.subscribeObserver(this);
    this.httpInvalidator.addInvalidateListener(() => {
      this.requests = 0;
    });
  }
  /* eslint-enable max-len */

  public onRun(actor: Actor<IActionHttp, IActorTest, IActorHttpOutput>,
    action: IActionHttp, output: Promise<IActorHttpOutput>): void {
    this.requests++;
  }
}

export interface IActionObserverHttpArgs extends IActionObserverArgs<IActionHttp, IActorHttpOutput> {
  /* eslint-disable max-len */
  /**
   * An actor that listens to HTTP invalidation events
   * @default {<default_invalidator> a <npmd:@comunica/bus-http-invalidate/^2.0.0/components/ActorHttpInvalidateListenable.jsonld#ActorHttpInvalidateListenable>}
   */
  httpInvalidator: ActorHttpInvalidateListenable;
  /* eslint-enable max-len */
}
