import {ActorRdfResolveQuadPatternSource, IActionRdfResolveQuadPattern, IActorRdfResolveQuadPatternOutput,
  ILazyQuadSource} from "@comunica/bus-rdf-resolve-quad-pattern";
import {ActionContext, IActorArgs, IActorTest} from "@comunica/core";
import {AsyncIterator} from "asynciterator";
import * as RDF from "rdf-js";

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
    const source = this.getContextSource(action.context);
    if (typeof source === 'string' || !source.value.match) {
      throw new Error(this.name + ' received an invalid rdfjsSource.');
    }
    return true;
  }

  protected getMetadata(source: ILazyQuadSource, pattern: RDF.BaseQuad, context: ActionContext,
                        data: AsyncIterator<RDF.Quad> & RDF.Stream): () => Promise<{[id: string]: any}> {
    // TODO: this should be optimized so that RDFJS sources can expose totalItems metadata
    return () => Promise.resolve({});
  }

  protected async getSource(context: ActionContext): Promise<ILazyQuadSource> {
    return (<any> this.getContextSource(context)).value;
  }

}
