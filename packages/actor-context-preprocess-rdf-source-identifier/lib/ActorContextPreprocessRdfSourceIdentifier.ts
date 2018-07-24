import {ActorContextPreprocess,
  IActorContextPreprocessOutput} from "@comunica/bus-context-preprocess";
import {IActionRdfSourceIdentifier, IActorRdfSourceIdentifierOutput} from "@comunica/bus-rdf-source-identifier";
import {Actor, IAction, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import {KEY_CONTEXT_SOURCES} from "../../bus-rdf-resolve-quad-pattern";

/**
 * A comunica RDF Source Identifier Context Preprocess Actor.
 */
export class ActorContextPreprocessRdfSourceIdentifier extends ActorContextPreprocess {

  public readonly mediatorRdfSourceIdentifier: Mediator<Actor<IActionRdfSourceIdentifier, IActorTest,
    IActorRdfSourceIdentifierOutput>, IActionRdfSourceIdentifier, IActorTest, IActorRdfSourceIdentifierOutput>;

  constructor(args: IActorContextPreprocessRdfSourceIdentifierArgs) {
    super(args);
  }

  public async test(action: IAction): Promise<IActorTest> {
    return true;
  }

  public async run(action: IAction): Promise<IActorContextPreprocessOutput> {
    if (action.context && action.context.get(KEY_CONTEXT_SOURCES)) {
      const sources = action.context.get(KEY_CONTEXT_SOURCES);
      const autoSources = sources.map((source: any, id: number) => ({ id, source }))
        .filter((entry: any) => entry.source.type === 'auto');
      const autoSourceTypePromises: Promise<IActorRdfSourceIdentifierOutput>[] = autoSources.map(
        (entry: any) => this.mediatorRdfSourceIdentifier.mediate({ sourceValue: entry.source.value }));
      const autoSourceTypes: IActorRdfSourceIdentifierOutput[] = await Promise.all(autoSourceTypePromises);
      for (let i = 0; i < autoSources.length; i++) {
        const sourceId = autoSources[i].id;
        const sourceType = autoSourceTypes[i].sourceType;
        if (sourceType) {
          sources[sourceId].type = sourceType;
        }
      }
      return { context: action.context.set(KEY_CONTEXT_SOURCES, sources) };
    }
    return action;
  }

}

export interface IActorContextPreprocessRdfSourceIdentifierArgs
  extends IActorArgs<IAction, IActorTest, IActorContextPreprocessOutput> {
  mediatorRdfSourceIdentifier: Mediator<Actor<IActionRdfSourceIdentifier, IActorTest,
    IActorRdfSourceIdentifierOutput>, IActionRdfSourceIdentifier, IActorTest, IActorRdfSourceIdentifierOutput>;
}
