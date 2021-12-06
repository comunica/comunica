import type { MediatorRdfSerializeHandle, MediatorRdfSerializeMediaTypeFormats,
  MediatorRdfSerializeMediaTypes } from '@comunica/bus-rdf-serialize';
import type { IActorSparqlSerializeArgs, IActorSparqlSerializeOutput } from '@comunica/bus-sparql-serialize';
import { ActorSparqlSerialize } from '@comunica/bus-sparql-serialize';
import type { IActorTest } from '@comunica/core';
import type { IActionContext, IQueryableResult, IQueryableResultQuads } from '@comunica/types';

/**
 * A comunica RDF SPARQL Serialize Actor.
 *
 * It serializes quad streams (for example resulting from a CONSTRUCT query)
 * to an RDF syntax.
 */
export class ActorSparqlSerializeRdf extends ActorSparqlSerialize implements IActorSparqlSerializeRdfArgs {
  public readonly mediatorRdfSerialize: MediatorRdfSerializeHandle;
  public readonly mediatorMediaTypeCombiner: MediatorRdfSerializeMediaTypes;
  public readonly mediatorMediaTypeFormatCombiner: MediatorRdfSerializeMediaTypeFormats;

  public constructor(args: IActorSparqlSerializeRdfArgs) {
    super(args);
  }

  public async testHandle(action: IQueryableResult, mediaType: string, context?: IActionContext):
  Promise<IActorTest> {
    // Check if we are provided with a quad stream
    if (action.type !== 'quads') {
      throw new Error(`Actor ${this.name} can only handle quad streams`);
    }

    // Check if the given media type can be handled
    const { mediaTypes } = await this.mediatorMediaTypeCombiner.mediate(
      { context, mediaTypes: true },
    );
    if (!(mediaType in mediaTypes)) {
      throw new Error(`Actor ${this.name} can not handle media type ${mediaType}. All available types: ${
        Object.keys(mediaTypes)}`);
    }
    return true;
  }

  public async runHandle(action: IQueryableResult, mediaType: string, context?: IActionContext):
  Promise<IActorSparqlSerializeOutput> {
    // Delegate handling to the mediator
    return (await this.mediatorRdfSerialize.mediate({
      context,
      handle: <IQueryableResultQuads> action,
      handleMediaType: mediaType,
    })).handle;
  }

  public async testMediaType(context: IActionContext): Promise<boolean> {
    return true;
  }

  public async getMediaTypes(context?: IActionContext): Promise<Record<string, number>> {
    return (await this.mediatorMediaTypeCombiner.mediate({ context, mediaTypes: true })).mediaTypes;
  }

  public async testMediaTypeFormats(context: IActionContext): Promise<boolean> {
    return true;
  }

  public async getMediaTypeFormats(context?: IActionContext): Promise<Record<string, string>> {
    return (await this.mediatorMediaTypeFormatCombiner.mediate({ context, mediaTypeFormats: true })).mediaTypeFormats;
  }
}

export interface IActorSparqlSerializeRdfArgs extends IActorSparqlSerializeArgs {
  mediatorRdfSerialize: MediatorRdfSerializeHandle;
  mediatorMediaTypeCombiner: MediatorRdfSerializeMediaTypes;
  mediatorMediaTypeFormatCombiner: MediatorRdfSerializeMediaTypeFormats;
}
