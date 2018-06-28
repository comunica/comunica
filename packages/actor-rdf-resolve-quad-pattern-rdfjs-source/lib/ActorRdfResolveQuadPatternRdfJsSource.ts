import {ActorRdfResolveQuadPatternSource, IActionRdfResolveQuadPattern, IActorRdfResolveQuadPatternOutput,
  ILazyQuadSource} from "@comunica/bus-rdf-resolve-quad-pattern";
import {IActorArgs, IActorTest} from "@comunica/core";

/**
 * A comunica RDFJS Source RDF Resolve Quad Pattern Actor.
 */
export class ActorRdfResolveQuadPatternRdfJsSource extends ActorRdfResolveQuadPatternSource {

  constructor(args: IActorArgs<IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput>) {
    super(args);
  }

  public async test(action: IActionRdfResolveQuadPattern): Promise<IActorTest> {
    if (!action.context || !action.context.sources || action.context.sources.length !== 1
      || action.context.sources[0].type !== 'rdfjsSource' || !action.context.sources[0].value) {
      throw new Error(this.name + ' requires a single source with an rdfjsSource to be present in the context.');
    }
    if (!action.context.sources[0].value.match) {
      throw new Error(this.name + ' received an invalid rdfjsSource.');
    }
    return true;
  }

  protected async getSource(context?: {[id: string]: any}): Promise<ILazyQuadSource> {
    return context.sources[0].value;
  }

}
