import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { IAggregatedStore } from '@comunica/types';

/**
 * A comunica actor for aggregated-store-factory events.
 *
 * Actor types:
 * * Input:  IActionAggregatedStoreFactory:      Empty action.
 * * Test:   <none>
 * * Output: IActorAggregatedStoreFactoryOutput: A new aggregated store.
 *
 * @see IActionAggregatedStoreFactory
 * @see IActorAggregatedStoreFactoryOutput
 */
export abstract class ActorAggregatedStoreFactory<TS = undefined>
  extends Actor<IActionAggregatedStoreFactory, IActorTest, IActorAggregatedStoreFactoryOutput, TS> {
  /* eslint-disable max-len */
  /**
   * @param args -
   *   \ @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   *   \ @defaultNested {Aggregated store creation failed: none of the configured actors were able to create an aggregated store} busFailMessage
   */
  /* eslint-enable max-len */
  public constructor(args: IActorAggregatedStoreFactoryArgs<TS>) {
    super(args);
  }
}

export interface IActionAggregatedStoreFactory extends IAction {

}

export interface IActorAggregatedStoreFactoryOutput extends IActorOutput {
  aggregatedStore: IAggregatedStore;
}

export type IActorAggregatedStoreFactoryArgs<TS = undefined> = IActorArgs<
IActionAggregatedStoreFactory,
IActorTest,
  IActorAggregatedStoreFactoryOutput,
TS
>;

export type MediatorAggregatedStoreFactory = Mediate<
IActionAggregatedStoreFactory,
  IActorAggregatedStoreFactoryOutput
>;
