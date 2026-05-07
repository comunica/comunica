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

  /**
   * @param args Arguments for this actor.
   */
  public constructor(args: IActorQueryResultSerializeRdfArgs) {
    super(args);
    this.mediatorRdfSerialize = args.mediatorRdfSerialize;
    this.mediatorMediaTypeCombiner = args.mediatorMediaTypeCombiner;
    this.mediatorMediaTypeFormatCombiner = args.mediatorMediaTypeFormatCombiner;
  }

  /**
   * Tests whether this actor can handle the given quad stream and media type.
   * @param action The serialization action to test.
   * @param mediaType The requested media type.
   * @param context The action context.
   * @return A test result that passes for supported quad streams and media types.
   */
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

  /**
   * Serializes the quad stream using the appropriate RDF serializer for the given media type.
   * @param action The serialization action containing the quad stream.
   * @param mediaType The media type to serialize to.
   * @param context The action context.
   * @return The serialization output.
   */
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

  /**
   * Tests whether this actor can report its supported media types.
   * @param _context The action context.
   * @return A passing test result.
   */
  public async testMediaType(_context: IActionContext): Promise<TestResult<boolean>> {
    return passTestVoid();
  }

  /**
   * Returns the available RDF serialization media types and their priorities.
   * @param context The action context.
   * @return A record mapping media type strings to priority values.
   */
  public async getMediaTypes(context: IActionContext): Promise<Record<string, number>> {
    return (await this.mediatorMediaTypeCombiner.mediate({ context, mediaTypes: true })).mediaTypes;
  }

  /**
   * Tests whether this actor can report its media type format mappings.
   * @param _context The action context.
   * @return A passing test result.
   */
  public async testMediaTypeFormats(_context: IActionContext): Promise<TestResult<boolean>> {
    return passTestVoid();
  }

  /**
   * Returns the available media type to format IRI mappings.
   * @param context The action context.
   * @return A record mapping media type strings to format IRIs.
   */
  public async getMediaTypeFormats(context: IActionContext): Promise<Record<string, string>> {
    return (await this.mediatorMediaTypeFormatCombiner.mediate({ context, mediaTypeFormats: true })).mediaTypeFormats;
  }
}

/**
 * Arguments interface for {@link ActorQueryResultSerializeRdf}.
 */
export interface IActorQueryResultSerializeRdfArgs extends IActorQueryResultSerializeArgs {
  /** The RDF serialization mediator for handling serialization. */
  mediatorRdfSerialize: MediatorRdfSerializeHandle;
  /** The mediator for combining available media types across RDF serializers. */
  mediatorMediaTypeCombiner: MediatorRdfSerializeMediaTypes;
  /** The mediator for combining media type format mappings across RDF serializers. */
  mediatorMediaTypeFormatCombiner: MediatorRdfSerializeMediaTypeFormats;
}
