import type {
  IActionAggregatedStoreFactory,
  IActorAggregatedStoreFactoryOutput,
  IActorAggregatedStoreFactoryArgs,
} from '@comunica/bus-aggregated-store-factory';
import { ActorAggregatedStoreFactory } from '@comunica/bus-aggregated-store-factory';
import type { MediatorRdfMetadataAccumulate } from '@comunica/bus-rdf-metadata-accumulate';
import { KeysInitQuery } from '@comunica/context-entries';
import type { TestResult, IActorTest } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { MetadataBindings } from '@comunica/types';
import { AggregatedStoreMemory } from './AggregatedStoreMemory';

/**
 * A comunica Memory Aggregated Store Factory Actor.
 */
export class ActorAggregatedStoreFactoryMemory extends ActorAggregatedStoreFactory {
  public readonly emitPartialCardinalities: boolean;
  public readonly mediatorMetadataAccumulate: MediatorRdfMetadataAccumulate;

  public constructor(args: IActorAggregatedStoreFactoryMemoryArgs) {
    super(args);
  }

  public async test(_action: IActionAggregatedStoreFactory): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionAggregatedStoreFactory): Promise<IActorAggregatedStoreFactoryOutput> {
    return {
      aggregatedStore: new AggregatedStoreMemory(
        undefined,
        async(accumulatedMetadata, appendingMetadata) => <MetadataBindings>
          (await this.mediatorMetadataAccumulate.mediate({
            mode: 'append',
            accumulatedMetadata,
            appendingMetadata,
            context: action.context,
          })).metadata,
        this.emitPartialCardinalities,
        action.context.getSafe(KeysInitQuery.dataFactory),
      ),
    };
  }
}

export interface IActorAggregatedStoreFactoryMemoryArgs extends IActorAggregatedStoreFactoryArgs {
  /**
   * Indicates whether the {@link AggregatedStoreMemory} should emit updated partial
   * cardinalities for each matching quad.
   *
   * Note: Enabling this option may degrade performance due to frequent
   * {@link MetadataValidationState} invalidations and updates.
   * @default {false}
   */
  emitPartialCardinalities: boolean;
  /**
   * The metadata accumulate mediator
   */
  mediatorMetadataAccumulate: MediatorRdfMetadataAccumulate;
}
