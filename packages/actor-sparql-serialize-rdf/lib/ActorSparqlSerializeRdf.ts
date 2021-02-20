import type { IActorArgsMediaTyped } from '@comunica/actor-abstract-mediatyped';

import type { IActionSparqlSerialize, IActionSparqlSerializeHandle, IActionSparqlSerializeMediaTypeFormats,
  IActionSparqlSerializeMediaTypes, IActorOutputSparqlSerializeHandle,
  IActorOutputSparqlSerializeMediaTypeFormats,
  IActorOutputSparqlSerializeMediaTypes,
  IActorSparqlSerializeOutput, IActorTestSparqlSerializeHandle,
  IActorTestSparqlSerializeMediaTypeFormats,
  IActorTestSparqlSerializeMediaTypes } from '@comunica/bus-sparql-serialize';
import {
  ActorSparqlSerialize,
} from '@comunica/bus-sparql-serialize';
import type { ActionContext, Actor, IActorTest, Mediator } from '@comunica/core';
import type { IActorQueryOperationOutput, IActorQueryOperationOutputQuads } from '@comunica/types';

/**
 * A comunica RDF SPARQL Serialize Actor.
 *
 * It serializes quad streams (for example resulting from a CONSTRUCT query)
 * to an RDF syntax.
 */
export class ActorSparqlSerializeRdf extends ActorSparqlSerialize implements IActorSparqlSerializeRdfArgs {
  public readonly mediatorRdfSerialize: Mediator<
  Actor<IActionSparqlSerializeHandle, IActorTestSparqlSerializeHandle, IActorOutputSparqlSerializeHandle>,
  IActionSparqlSerializeHandle, IActorTestSparqlSerializeHandle, IActorOutputSparqlSerializeHandle>;

  public readonly mediatorMediaTypeCombiner: Mediator<
  Actor<IActionSparqlSerializeMediaTypes, IActorTestSparqlSerializeMediaTypes, IActorOutputSparqlSerializeMediaTypes>,
  IActionSparqlSerializeMediaTypes, IActorTestSparqlSerializeMediaTypes, IActorOutputSparqlSerializeMediaTypes>;

  public readonly mediatorMediaTypeFormatCombiner: Mediator<
  Actor<IActionSparqlSerializeMediaTypeFormats, IActorTestSparqlSerializeMediaTypeFormats,
  IActorOutputSparqlSerializeMediaTypeFormats>,
  IActionSparqlSerializeMediaTypeFormats, IActorTestSparqlSerializeMediaTypeFormats,
  IActorOutputSparqlSerializeMediaTypeFormats>;

  public constructor(args: IActorSparqlSerializeRdfArgs) {
    super(args);
  }

  public async testHandle(action: IActorQueryOperationOutput, mediaType: string, context?: ActionContext):
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

  public async runHandle(action: IActorQueryOperationOutput, mediaType: string, context?: ActionContext):
  Promise<IActorSparqlSerializeOutput> {
    // Delegate handling to the mediator
    return (await this.mediatorRdfSerialize.mediate({
      context,
      handle: <IActorQueryOperationOutputQuads> action,
      handleMediaType: mediaType,
    })).handle;
  }

  public async testMediaType(context: ActionContext): Promise<boolean> {
    return true;
  }

  public async getMediaTypes(context?: ActionContext): Promise<Record<string, number>> {
    return (await this.mediatorMediaTypeCombiner.mediate({ context, mediaTypes: true })).mediaTypes;
  }

  public async testMediaTypeFormats(context: ActionContext): Promise<boolean> {
    return true;
  }

  public async getMediaTypeFormats(context?: ActionContext): Promise<Record<string, string>> {
    return (await this.mediatorMediaTypeFormatCombiner.mediate({ context, mediaTypeFormats: true })).mediaTypeFormats;
  }
}

export interface IActorSparqlSerializeRdfArgs
  extends IActorArgsMediaTyped<IActionSparqlSerialize, IActorTest, IActorSparqlSerializeOutput> {
  mediatorRdfSerialize: Mediator<
  Actor<IActionSparqlSerializeHandle, IActorTestSparqlSerializeHandle, IActorOutputSparqlSerializeHandle>,
  IActionSparqlSerializeHandle, IActorTestSparqlSerializeHandle, IActorOutputSparqlSerializeHandle>;
  mediatorMediaTypeCombiner: Mediator<
  Actor<IActionSparqlSerializeMediaTypes, IActorTestSparqlSerializeMediaTypes, IActorOutputSparqlSerializeMediaTypes>,
  IActionSparqlSerializeMediaTypes, IActorTestSparqlSerializeMediaTypes, IActorOutputSparqlSerializeMediaTypes>;
  mediatorMediaTypeFormatCombiner: Mediator<
  Actor<IActionSparqlSerializeMediaTypeFormats, IActorTestSparqlSerializeMediaTypeFormats,
  IActorOutputSparqlSerializeMediaTypeFormats>,
  IActionSparqlSerializeMediaTypeFormats, IActorTestSparqlSerializeMediaTypeFormats,
  IActorOutputSparqlSerializeMediaTypeFormats>;
}
