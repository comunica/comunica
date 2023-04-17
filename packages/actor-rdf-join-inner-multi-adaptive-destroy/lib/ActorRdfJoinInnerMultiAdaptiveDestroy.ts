import { ClosableTransformIterator } from '@comunica/bus-query-operation';
import type {
  IActionRdfJoin,
  IActorRdfJoinArgs,
  MediatorRdfJoin, IActorRdfJoinOutputInner,
} from '@comunica/bus-rdf-join';
import {
  ActorRdfJoin,
} from '@comunica/bus-rdf-join';
import { KeysRdfJoin } from '@comunica/context-entries';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { IQueryOperationResultBindings, MetadataBindings, IJoinEntry } from '@comunica/types';
import { BindingsStreamAdaptiveDestroy } from './BindingsStreamAdaptiveDestroy';

/**
 * A comunica Inner Multi Adaptive Destroy RDF Join Actor.
 */
export class ActorRdfJoinInnerMultiAdaptiveDestroy extends ActorRdfJoin {
  public readonly mediatorJoin: MediatorRdfJoin;
  public readonly timeout: number;

  public constructor(args: IActorRdfJoinInnerMultiAdaptiveDestroyArgs) {
    super(args, {
      logicalType: 'inner',
      physicalName: 'multi-adaptive-destroy',
    });
  }

  public async test(action: IActionRdfJoin): Promise<IMediatorTypeJoinCoefficients> {
    if (action.context.get(KeysRdfJoin.skipAdaptiveJoin)) {
      throw new Error(`Actor ${this.name} could not run because adaptive join processing is disabled.`);
    }
    return super.test(action);
  }

  public async run(action: IActionRdfJoin): Promise<IQueryOperationResultBindings> {
    return super.run(action);
  }

  protected cloneEntries(entries: IJoinEntry[], allowClosingOriginals: boolean): IJoinEntry[] {
    return entries.map(entry => ({
      operation: entry.operation,
      output: {
        ...entry.output,
        // Clone stream, as we'll also need it later
        bindingsStream: new ClosableTransformIterator(entry.output.bindingsStream.clone(), {
          autoStart: false,
          onClose() {
            if (allowClosingOriginals) {
              entry.output.bindingsStream.destroy();
            }
          },
        }),
      },
    }));
  }

  protected async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    // Disable adaptive joins in recursive calls to this bus, to avoid infinite recursion on this actor.
    const subContext = action.context.set(KeysRdfJoin.skipAdaptiveJoin, true);

    // Execute the join with the metadata we have now
    const firstOutput = await this.mediatorJoin.mediate({
      type: action.type,
      entries: this.cloneEntries(action.entries, false),
      context: subContext,
    });

    return {
      result: {
        type: 'bindings',
        bindingsStream: new BindingsStreamAdaptiveDestroy(
          firstOutput.bindingsStream,
          async() =>
            // Restart the join with the latest metadata
            (await this.mediatorJoin.mediate({
              type: action.type,
              entries: this.cloneEntries(action.entries, true),
              context: subContext,
            })).bindingsStream
          ,
          { timeout: this.timeout, autoStart: false },
        ),
        metadata: firstOutput.metadata,
      },
    };
  }

  protected async getJoinCoefficients(
    action: IActionRdfJoin,
    metadatas: MetadataBindings[],
  ): Promise<IMediatorTypeJoinCoefficients> {
    // Dummy join coefficients to make sure we always run first
    return {
      iterations: 0,
      persistedItems: 0,
      blockingItems: 0,
      requestTime: 0,
    };
  }
}

export interface IActorRdfJoinInnerMultiAdaptiveDestroyArgs extends IActorRdfJoinArgs {
  mediatorJoin: MediatorRdfJoin;
  /**
   * @default {1000}
   */
  timeout: number;
}
