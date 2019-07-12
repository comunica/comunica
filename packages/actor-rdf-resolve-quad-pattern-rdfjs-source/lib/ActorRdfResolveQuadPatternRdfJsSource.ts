import {ActorRdfResolveQuadPatternSource, IActionRdfResolveQuadPattern, IActorRdfResolveQuadPatternOutput,
  ILazyQuadSource} from "@comunica/bus-rdf-resolve-quad-pattern";
import {ActionContext, IActorArgs, IActorTest} from "@comunica/core";

/**
 * A comunica RDFJS Source RDF Resolve Quad Pattern Actor.
 */
export class ActorRdfResolveQuadPatternRdfJsSource extends ActorRdfResolveQuadPatternSource {

  constructor(args: IActorArgs<IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput>) {
    super(args);
  }

  public async test(action: IActionRdfResolveQuadPattern): Promise<IActorTest> {
    if (!this.hasContextSingleSourceOfType('rdfjsSource', action.context)) {
      throw new Error(this.name + ' requires a single source with an rdfjsSource to be present in the context.');
    }
    if (!this.getContextSource(action.context).value.match) {
      throw new Error(this.name + ' received an invalid rdfjsSource.');
    }
    return true;
  }

  protected async getSource(context: ActionContext): Promise<ILazyQuadSource> {
    return <any> this.getContextSource(context).value;
  }

}
