import { BindingsFactory } from '@comunica/bindings-factory';
import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type {
  IActionQuerySourceIdentify,
  IActorQuerySourceIdentifyOutput,
  IActorQuerySourceIdentifyArgs,
} from '@comunica/bus-query-source-identify';
import { ActorQuerySourceIdentify } from '@comunica/bus-query-source-identify';
import type { IActorTest } from '@comunica/core';
import { ActionContext } from '@comunica/core';
import type * as RDF from '@rdfjs/types';
import { QuerySourceRdfJs } from './QuerySourceRdfJs';

/**
 * A comunica RDFJS Query Source Identify Actor.
 */
export class ActorQuerySourceIdentifyRdfJs extends ActorQuerySourceIdentify {
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;

  public constructor(args: IActorQuerySourceIdentifyRdfJsArgs) {
    super(args);
  }

  public async test(action: IActionQuerySourceIdentify): Promise<IActorTest> {
    const source = action.querySourceUnidentified;
    if (source.type !== undefined && source.type !== 'rdfjs') {
      throw new Error(`${this.name} requires a single query source with rdfjs type to be present in the context.`);
    }
    if (typeof source.value === 'string' || !('match' in source.value)) {
      throw new Error(`${this.name} received an invalid rdfjs query source.`);
    }
    return true;
  }

  public async run(action: IActionQuerySourceIdentify): Promise<IActorQuerySourceIdentifyOutput> {
    return {
      querySource: {
        source: new QuerySourceRdfJs(
          <RDF.Source> action.querySourceUnidentified.value,
          await BindingsFactory.create(this.mediatorMergeBindingsContext, action.context),
        ),
        context: action.querySourceUnidentified.context ?? new ActionContext(),
      },
    };
  }
}

export interface IActorQuerySourceIdentifyRdfJsArgs extends IActorQuerySourceIdentifyArgs {
  /**
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeBindingsContext: MediatorMergeBindingsContext;
}
