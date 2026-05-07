import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type {
  IActionRdfJoin,
  IActorRdfJoinOutputInner,
  IActorRdfJoinArgs,
  IActorRdfJoinTestSideData,
} from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import { KeysInitQuery } from '@comunica/context-entries';
import type { TestResult } from '@comunica/core';
import { passTestWithSideData, failTest } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { ComunicaDataFactory } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';

/**
 * A comunica None RDF Join Actor.
 */
export class ActorRdfJoinNone extends ActorRdfJoin {
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;

  /**
   * Creates an instance of {@link ActorRdfJoinNone}.
   * @param args The arguments for this actor.
   */
  public constructor(args: IActorRdfJoinNoneArgs) {
    super(args, {
      logicalType: 'inner',
      physicalName: 'none',
      limitEntries: 0,
    });
    this.mediatorMergeBindingsContext = args.mediatorMergeBindingsContext;
  }

  /**
   * Tests whether this actor can handle the given join action, accepting only actions with zero entries.
   * @param action The join action to test.
   * @return A test result with join coefficients, or a failure if entries are present.
   */
  public override async test(
    action: IActionRdfJoin,
  ): Promise<TestResult<IMediatorTypeJoinCoefficients, IActorRdfJoinTestSideData>> {
    // Allow joining of one or zero streams
    if (action.entries.length > 0) {
      return failTest(`Actor ${this.name} can only join zero entries`);
    }
    return await this.getJoinCoefficients(action, undefined!);
  }

  /**
   * Produces a join output consisting of a single empty bindings entry.
   * @param action The join action to execute.
   * @return The inner join output with a single-element bindings stream and exact cardinality of one.
   */
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
          variables: [],
        }),
        type: 'bindings',
      },
    };
  }

  /**
   * Returns zero-cost join coefficients for the empty join.
   * @param action The join action to evaluate.
   * @param sideData Pre-computed side data including entry metadata.
   * @return A test result containing zero-valued join coefficients.
   */
  protected async getJoinCoefficients(
    action: IActionRdfJoin,
    sideData: IActorRdfJoinTestSideData,
  ): Promise<TestResult<IMediatorTypeJoinCoefficients, IActorRdfJoinTestSideData>> {
    return passTestWithSideData({
      iterations: 0,
      persistedItems: 0,
      blockingItems: 0,
      requestTime: 0,
    }, sideData);
  }
}

export interface IActorRdfJoinNoneArgs extends IActorRdfJoinArgs {
  /**
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeBindingsContext: MediatorMergeBindingsContext;
}
