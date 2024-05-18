import { BindingsFactory } from '@comunica/bindings-factory';
import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type { IActionRdfJoin, IActorRdfJoinOutputInner, IActorRdfJoinArgs } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import { MetadataValidationState } from '@comunica/metadata';
import type { ComunicaDataFactory } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';

/**
 * A comunica None RDF Join Actor.
 */
export class ActorRdfJoinNone extends ActorRdfJoin {
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;

  public constructor(args: IActorRdfJoinNoneArgs) {
    super(args, {
      logicalType: 'inner',
      physicalName: 'none',
      limitEntries: 0,
    });
  }

  public override async test(action: IActionRdfJoin): Promise<IMediatorTypeJoinCoefficients> {
    // Allow joining of one or zero streams
    if (action.entries.length > 0) {
      throw new Error(`Actor ${this.name} can only join zero entries`);
    }
    return await this.getJoinCoefficients();
  }

  protected async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const bindingsFactory = await BindingsFactory.create(
      this.mediatorMergeBindingsContext,
      action.context,
      dataFactory,
    );
    return {
      result: {
        bindingsStream: new ArrayIterator<RDF.Bindings>([ bindingsFactory.bindings() ], { autoStart: false }),
        metadata: () => Promise.resolve({
          state: new MetadataValidationState(),
          cardinality: { type: 'exact', value: 1 },
          canContainUndefs: false,
          variables: [],
        }),
        type: 'bindings',
      },
    };
  }

  protected async getJoinCoefficients(): Promise<IMediatorTypeJoinCoefficients> {
    return {
      iterations: 0,
      persistedItems: 0,
      blockingItems: 0,
      requestTime: 0,
    };
  }
}

export interface IActorRdfJoinNoneArgs extends IActorRdfJoinArgs {
  /**
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeBindingsContext: MediatorMergeBindingsContext;
}
