import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type {
  IActionQuerySourceIdentify,
  IActorQuerySourceIdentifyOutput,
  IActorQuerySourceIdentifyArgs,
} from '@comunica/bus-query-source-identify';
import { ActorQuerySourceIdentify } from '@comunica/bus-query-source-identify';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid, ActionContext } from '@comunica/core';
import type { ComunicaDataFactory } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
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

  public async test(action: IActionQuerySourceIdentify): Promise<TestResult<IActorTest>> {
    const source = action.querySourceUnidentified;
    if (source.type !== undefined && source.type !== 'rdfjs') {
      return failTest(`${this.name} requires a single query source with rdfjs type to be present in the context.`);
    }
    if (typeof source.value === 'string' || !('match' in source.value)) {
      return failTest(`${this.name} received an invalid rdfjs query source.`);
    }
    return passTestVoid();
  }

  public async run(action: IActionQuerySourceIdentify): Promise<IActorQuerySourceIdentifyOutput> {
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    return {
      querySource: {
        source: new QuerySourceRdfJs(
          <RDF.Source> action.querySourceUnidentified.value,
          dataFactory,
          await BindingsFactory.create(this.mediatorMergeBindingsContext, action.context, dataFactory),
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
