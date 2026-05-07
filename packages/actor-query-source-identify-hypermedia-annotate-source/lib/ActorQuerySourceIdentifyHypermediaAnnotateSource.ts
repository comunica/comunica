import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type {
  IActionQuerySourceIdentifyHypermedia,
  IActorQuerySourceIdentifyHypermediaOutput,
  IActorQuerySourceIdentifyHypermediaArgs,
  IActorQuerySourceIdentifyHypermediaTest,
  MediatorQuerySourceIdentifyHypermedia,
} from '@comunica/bus-query-source-identify-hypermedia';
import { ActorQuerySourceIdentifyHypermedia } from '@comunica/bus-query-source-identify-hypermedia';
import type { TestResult } from '@comunica/core';
import { ActionContextKey, failTest, passTest } from '@comunica/core';
import { QuerySourceAddSourceAttribution } from './QuerySourceAddSourceAttribution';

/**
 * A comunica None Query Source Identify Hypermedia Actor.
 */
export class ActorQuerySourceIdentifyHypermediaAnnotateSource extends ActorQuerySourceIdentifyHypermedia {
  /**
   * The mediator for creating binding context merge handlers.
   */
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;
  /**
   * The mediator for identifying the underlying hypermedia query source.
   */
  public readonly mediatorQuerySourceIdentifyHypermedia: MediatorQuerySourceIdentifyHypermedia;

  /**
   * Creates a new annotate source hypermedia actor.
   * @param args The actor arguments.
   */
  public constructor(args: IActorQuerySourceIdentifyHypermediaAnnotateSourceArgs) {
    super(args, 'file');
    this.mediatorMergeBindingsContext = args.mediatorMergeBindingsContext;
    this.mediatorQuerySourceIdentifyHypermedia = args.mediatorQuerySourceIdentifyHypermedia;
  }

  /**
   * Tests whether this source has not already been wrapped.
   * @param action The hypermedia identification action.
   * @return A test result with infinite filter factor or failure if already wrapped.
   */
  public async testMetadata(
    action: IActionQuerySourceIdentifyHypermedia,
  ): Promise<TestResult<IActorQuerySourceIdentifyHypermediaTest>> {
    if (action.context.get(KEY_CONTEXT_WRAPPED)) {
      return failTest('Unable to wrap query source multiple times');
    }
    return passTest({ filterFactor: Number.POSITIVE_INFINITY });
  }

  /**
   * Wraps the identified hypermedia source with source attribution.
   * @param action The hypermedia identification action.
   * @return The identified source wrapped with attribution.
   */
  public async run(action: IActionQuerySourceIdentifyHypermedia): Promise<IActorQuerySourceIdentifyHypermediaOutput> {
    const context = action.context.set(KEY_CONTEXT_WRAPPED, true);
    action.context = context;

    const { source, dataset } = await this.mediatorQuerySourceIdentifyHypermedia.mediate(action);
    return { source: new QuerySourceAddSourceAttribution(source), dataset };
  }
}

export interface IActorQuerySourceIdentifyHypermediaAnnotateSourceArgs extends IActorQuerySourceIdentifyHypermediaArgs {
  /**
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeBindingsContext: MediatorMergeBindingsContext;
  /**
   * A mediator to create the wrapped query source
   */
  mediatorQuerySourceIdentifyHypermedia: MediatorQuerySourceIdentifyHypermedia;
}

/**
 * Context key indicating the query source has already been wrapped with attribution.
 */
export const KEY_CONTEXT_WRAPPED = new ActionContextKey<boolean>(
  '@comunica/actor-query-source-identify-hypermedia-annotate-source:wrapped',
);
