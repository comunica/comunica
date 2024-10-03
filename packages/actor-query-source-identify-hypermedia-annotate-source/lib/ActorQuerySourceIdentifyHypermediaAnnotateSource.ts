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
import { ActionContextKey, passTest } from '@comunica/core';
import { QuerySourceAddSourceAttribution } from './QuerySourceAddSourceAttribution';

/**
 * A comunica None Query Source Identify Hypermedia Actor.
 */
export class ActorQuerySourceIdentifyHypermediaAnnotateSource extends ActorQuerySourceIdentifyHypermedia {
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;
  public readonly mediatorQuerySourceIdentifyHypermedia: MediatorQuerySourceIdentifyHypermedia;

  public constructor(args: IActorQuerySourceIdentifyHypermediaAnnotateSourceArgs) {
    super(args, 'file');
  }

  public async testMetadata(
    action: IActionQuerySourceIdentifyHypermedia,
  ): Promise<TestResult<IActorQuerySourceIdentifyHypermediaTest>> {
    if (action.context.get(KEY_CONTEXT_WRAPPED)) {
      throw new Error('Unable to wrap query source multiple times');
    }
    return passTest({ filterFactor: Number.POSITIVE_INFINITY });
  }

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

export const KEY_CONTEXT_WRAPPED = new ActionContextKey<boolean>(
  '@comunica/actor-query-source-identify-hypermedia-annotate-source:wrapped',
);
