import type { IActorContextPreprocessOutput } from '@comunica/bus-context-preprocess';
import { ActorContextPreprocess } from '@comunica/bus-context-preprocess';
import type { DataSources,
  IDataSource } from '@comunica/bus-rdf-resolve-quad-pattern';
import {
  getDataSourceValue,
  KEY_CONTEXT_SOURCE,
  KEY_CONTEXT_SOURCES,
} from '@comunica/bus-rdf-resolve-quad-pattern';
import type { IActionRdfSourceIdentifier, IActorRdfSourceIdentifierOutput } from '@comunica/bus-rdf-source-identifier';
import type { ActionContext, Actor, IAction, IActorArgs, IActorTest, Mediator } from '@comunica/core';

/**
 * A comunica RDF Source Identifier Context Preprocess Actor.
 */
export class ActorContextPreprocessRdfSourceIdentifier extends ActorContextPreprocess {
  public readonly mediatorRdfSourceIdentifier: Mediator<Actor<IActionRdfSourceIdentifier, IActorTest,
  IActorRdfSourceIdentifierOutput>, IActionRdfSourceIdentifier, IActorTest, IActorRdfSourceIdentifierOutput>;

  public constructor(args: IActorContextPreprocessRdfSourceIdentifierArgs) {
    super(args);
  }

  public async test(action: IAction): Promise<IActorTest> {
    return true;
  }

  public async run(action: IAction): Promise<IActorContextPreprocessOutput> {
    if (action.context) {
      if (action.context.get(KEY_CONTEXT_SOURCE)) {
        let source = action.context.get(KEY_CONTEXT_SOURCE);
        let { context } = action;
        if (source.type === 'auto') {
          context = action.context.delete(KEY_CONTEXT_SOURCE);
          source = await this.identifySource(source, context);
          context = context.set(KEY_CONTEXT_SOURCE, source);
        }
        return { context };
      }
      if (action.context.get(KEY_CONTEXT_SOURCES)) {
        const subContext: ActionContext = action.context.delete(KEY_CONTEXT_SOURCES);

        const sources: DataSources = action.context.get(KEY_CONTEXT_SOURCES);
        const newSources: DataSources = [];
        for (const source of sources) {
          newSources.push(await this.identifySource(source, subContext));
        }

        return { context: action.context.set(KEY_CONTEXT_SOURCES, newSources) };
      }
    }
    return action;
  }

  private async identifySource(source: IDataSource, context: ActionContext): Promise<IDataSource> {
    return this.mediatorRdfSourceIdentifier.mediate(
      { sourceValue: <any> getDataSourceValue(source), context },
    )
      .then(sourceIdentificationResult => {
        if (sourceIdentificationResult.sourceType) {
          (<any> source).type = sourceIdentificationResult.sourceType;
        }
        return source;
      });
  }
}

export interface IActorContextPreprocessRdfSourceIdentifierArgs
  extends IActorArgs<IAction, IActorTest, IActorContextPreprocessOutput> {
  mediatorRdfSourceIdentifier: Mediator<Actor<IActionRdfSourceIdentifier, IActorTest,
  IActorRdfSourceIdentifierOutput>, IActionRdfSourceIdentifier, IActorTest, IActorRdfSourceIdentifierOutput>;
}
