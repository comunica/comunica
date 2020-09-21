import type { IActionRdfResolveQuadPattern, IActorRdfResolveQuadPatternOutput,
  IQuadSource } from '@comunica/bus-rdf-resolve-quad-pattern';
import {
  ActorRdfResolveQuadPatternSource,
} from '@comunica/bus-rdf-resolve-quad-pattern';
import type { ActionContext, IActorArgs, IActorTest } from '@comunica/core';
import { RdfJsQuadSource } from './RdfJsQuadSource';

/**
 * A comunica RDFJS Source RDF Resolve Quad Pattern Actor.
 */
export class ActorRdfResolveQuadPatternRdfJsSource extends ActorRdfResolveQuadPatternSource {
  public constructor(args: IActorArgs<IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput>) {
    super(args);
  }

  public async test(action: IActionRdfResolveQuadPattern): Promise<IActorTest> {
    if (!this.hasContextSingleSourceOfType('rdfjsSource', action.context)) {
      throw new Error(`${this.name} requires a single source with an rdfjsSource to be present in the context.`);
    }
    const source = this.getContextSource(action.context);
    if (!source || typeof source === 'string' || (!('match' in source) && !source.value.match)) {
      throw new Error(`${this.name} received an invalid rdfjsSource.`);
    }
    return true;
  }

  protected async getSource(context: ActionContext): Promise<IQuadSource> {
    const source: any = <any> this.getContextSource(context);
    return new RdfJsQuadSource('match' in source ? source : source.value);
  }
}
