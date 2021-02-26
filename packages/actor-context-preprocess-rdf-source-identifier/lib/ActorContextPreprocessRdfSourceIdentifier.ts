import type { IActorContextPreprocessOutput } from '@comunica/bus-context-preprocess';
import { ActorContextPreprocess } from '@comunica/bus-context-preprocess';
import type { DataSources, IDataSource } from '@comunica/bus-rdf-resolve-quad-pattern';
import { getDataSourceValue } from '@comunica/bus-rdf-resolve-quad-pattern';
import type { IActionRdfSourceIdentifier, IActorRdfSourceIdentifierOutput } from '@comunica/bus-rdf-source-identifier';
import { KeysRdfResolveQuadPattern } from '@comunica/context-entries';
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
      if (action.context.get(KeysRdfResolveQuadPattern.source)) {
        let source = action.context.get(KeysRdfResolveQuadPattern.source);
        let { context } = action;
        if (source.type === 'auto') {
          context = action.context.delete(KeysRdfResolveQuadPattern.source);
          source = await this.identifySource(source, context);
          context = context.set(KeysRdfResolveQuadPattern.source, source);
        }
        return { context };
      }
      if (action.context.get(KeysRdfResolveQuadPattern.sources)) {
        const subContext: ActionContext = action.context.delete(KeysRdfResolveQuadPattern.sources);

        const sources: DataSources = action.context.get(KeysRdfResolveQuadPattern.sources);
        const newSources: DataSources = [];
        for (const source of sources) {
          newSources.push(await this.identifySource(source, subContext));
        }

        return { context: action.context.set(KeysRdfResolveQuadPattern.sources, newSources) };
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
