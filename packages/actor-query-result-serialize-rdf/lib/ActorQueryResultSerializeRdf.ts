import type {
  IActorQueryResultSerializeArgs,
  IActorQueryResultSerializeOutput,
  IActionSparqlSerialize,
} from '@comunica/bus-query-result-serialize';
import { ActorQueryResultSerialize } from '@comunica/bus-query-result-serialize';
import type {
  MediatorRdfSerializeHandle,
  MediatorRdfSerializeMediaTypeFormats,
  MediatorRdfSerializeMediaTypes,
} from '@comunica/bus-rdf-serialize';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import type { IActionContext, IQueryOperationResultQuads } from '@comunica/types';

/**
 * A comunica RDF Query Result Serialize Actor.
 *
 * It serializes quad streams (for example resulting from a CONSTRUCT query)
 * to an RDF syntax.
 */
export class ActorQueryResultSerializeRdf extends ActorQueryResultSerialize
  implements IActorQueryResultSerializeRdfArgs {
  public readonly mediatorRdfSerialize: MediatorRdfSerializeHandle;
  public readonly mediatorMediaTypeCombiner: MediatorRdfSerializeMediaTypes;
  public readonly mediatorMediaTypeFormatCombiner: MediatorRdfSerializeMediaTypeFormats;

  public constructor(args: IActorQueryResultSerializeRdfArgs) {
    super(args);
    this.mediatorRdfSerialize = args.mediatorRdfSerialize;
    this.mediatorMediaTypeCombiner = args.mediatorMediaTypeCombiner;
    this.mediatorMediaTypeFormatCombiner = args.mediatorMediaTypeFormatCombiner;
  }

  public async testHandle(action: IActionSparqlSerialize, mediaType: string, context: IActionContext):
  Promise<TestResult<IActorTest>> {
    // Check if we are provided with a quad stream
    if (action.type !== 'quads') {
      return failTest(`Actor ${this.name} can only handle quad streams`);
    }

    // Check if the given media type can be handled
    const { mediaTypes } = await this.mediatorMediaTypeCombiner.mediate(
      { context, mediaTypes: true },
    );
    if (!(mediaType in mediaTypes)) {
      return failTest(`Actor ${this.name} can not handle media type ${mediaType}. All available types: ${
        // eslint-disable-next-line ts/restrict-template-expressions
        Object.keys(mediaTypes)}`);
    }
    return passTestVoid();
  }

  public async runHandle(action: IActionSparqlSerialize, mediaType: string, context: IActionContext):
  Promise<IActorQueryResultSerializeOutput> {
    // Delegate handling to the mediator
    return (await this.mediatorRdfSerialize.mediate({
      context,
      handle: {
        context,
        quadStream: (<IQueryOperationResultQuads> action).quadStream,
      },
      handleMediaType: mediaType,
    })).handle;
  }

  public async testMediaType(_context: IActionContext): Promise<TestResult<boolean>> {
    return passTestVoid();
  }

  public async getMediaTypes(context: IActionContext): Promise<Record<string, number>> {
    return (await this.mediatorMediaTypeCombiner.mediate({ context, mediaTypes: true })).mediaTypes;
  }

  public async testMediaTypeFormats(_context: IActionContext): Promise<TestResult<boolean>> {
    return passTestVoid();
  }

  public async getMediaTypeFormats(context: IActionContext): Promise<Record<string, string>> {
    return (await this.mediatorMediaTypeFormatCombiner.mediate({ context, mediaTypeFormats: true })).mediaTypeFormats;
  }
}

export interface IActorQueryResultSerializeRdfArgs extends IActorQueryResultSerializeArgs {
  mediatorRdfSerialize: MediatorRdfSerializeHandle;
  mediatorMediaTypeCombiner: MediatorRdfSerializeMediaTypes;
  mediatorMediaTypeFormatCombiner: MediatorRdfSerializeMediaTypeFormats;
}
