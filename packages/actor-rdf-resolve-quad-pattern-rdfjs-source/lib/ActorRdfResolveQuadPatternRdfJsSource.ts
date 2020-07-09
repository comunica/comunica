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

  public static nullifyVariables(term?: RDF.Term): RDF.Term | undefined {
    return !term || term.termType === 'Variable' ? undefined : term;
  }

  public async test(action: IActionRdfResolveQuadPattern): Promise<IActorTest> {
    if (!this.hasContextSingleSourceOfType('rdfjsSource', action.context)) {
      throw new Error(this.name + ' requires a single source with an rdfjsSource to be present in the context.');
    }
    const source = this.getContextSource(action.context);
    if (!source || typeof source === 'string' || !source.value.match) {
      throw new Error(this.name + ' received an invalid rdfjsSource.');
    }
    return true;
  }

  protected getMetadata(source: ILazyQuadSource, pattern: RDF.BaseQuad, context: ActionContext,
                        data: AsyncIterator<RDF.Quad> & RDF.Stream): () => Promise<{[id: string]: any}> {
    return async () => {
      if (source.countQuads) {
        // If the source provides a dedicated method for determining cardinality, use that.
        const totalItems = await source.countQuads(
            ActorRdfResolveQuadPatternRdfJsSource.nullifyVariables(pattern.subject),
            ActorRdfResolveQuadPatternRdfJsSource.nullifyVariables(pattern.predicate),
            ActorRdfResolveQuadPatternRdfJsSource.nullifyVariables(pattern.object),
            ActorRdfResolveQuadPatternRdfJsSource.nullifyVariables(pattern.graph),
        );
        return { totalItems };
      } else {
        // Otherwise, fallback to a sub-optimal alternative where we just call match again to count the quads.
        const totalItems = await new Promise((resolve, reject) => {
          let i = 0;
          const matches = source.match(
              ActorRdfResolveQuadPatternRdfJsSource.nullifyVariables(pattern.subject),
              ActorRdfResolveQuadPatternRdfJsSource.nullifyVariables(pattern.predicate),
              ActorRdfResolveQuadPatternRdfJsSource.nullifyVariables(pattern.object),
              ActorRdfResolveQuadPatternRdfJsSource.nullifyVariables(pattern.graph),
          );
          matches.on('error', reject);
          matches.on('end', () => resolve(i));
          matches.on('data', () => i++);
        });
        return { totalItems };
      }
    };
  }

  protected async getSource(context: ActionContext): Promise<ILazyQuadSource> {
    return (<any> this.getContextSource(context)).value;
  }

}
