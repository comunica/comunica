import {IActorArgsMediaTyped} from "@comunica/actor-abstract-mediatyped";
import {IActorQueryOperationOutput, IActorQueryOperationOutputQuads} from "@comunica/bus-query-operation";
import {IActionRootRdfSerialize, IActorOutputRootRdfSerialize,
  IActorTestRootRdfSerialize} from "@comunica/bus-rdf-serialize";
import {ActorSparqlSerialize, IActionSparqlSerialize,
  IActorSparqlSerializeOutput} from "@comunica/bus-sparql-serialize";
import {ActionContext, Actor, IActorTest, Mediator} from "@comunica/core";

/**
 * A comunica RDF SPARQL Serialize Actor.
 *
 * It serializes quad streams (for example resulting from a CONSTRUCT query)
 * to an RDF syntax.
 */
export class ActorSparqlSerializeRdf extends ActorSparqlSerialize implements IActorSparqlSerializeRdfArgs {

  public readonly mediatorRdfSerialize: Mediator<Actor<IActionRootRdfSerialize, IActorTestRootRdfSerialize,
    IActorOutputRootRdfSerialize>, IActionRootRdfSerialize, IActorTestRootRdfSerialize, IActorOutputRootRdfSerialize>;
  public readonly mediatorMediaTypeCombiner: Mediator<Actor<IActionRootRdfSerialize, IActorTestRootRdfSerialize,
    IActorOutputRootRdfSerialize>, IActionRootRdfSerialize, IActorTestRootRdfSerialize, IActorOutputRootRdfSerialize>;
  public readonly mediatorMediaTypeFormatCombiner: Mediator<Actor<IActionRootRdfSerialize, IActorTestRootRdfSerialize,
    IActorOutputRootRdfSerialize>, IActionRootRdfSerialize, IActorTestRootRdfSerialize, IActorOutputRootRdfSerialize>;

  constructor(args: IActorSparqlSerializeRdfArgs) {
    super(args);
  }

  public async testHandle(action: IActorQueryOperationOutput, mediaType: string, context: ActionContext)
    : Promise<IActorTest> {
    // Check if we are provided with a quad stream
    if (action.type !== 'quads') {
      throw new Error('Actor ' + this.name + ' can only handle quad streams');
    }

    // Check if the given media type can be handled
    const mediaTypes: {[id: string]: number} = (await this.mediatorMediaTypeCombiner.mediate(
      { context, mediaTypes: true })).mediaTypes;
    if (!(mediaType in mediaTypes)) {
      throw new Error('Actor ' + this.name + ' can not handle media type ' + mediaType + '. All available types: '
      + Object.keys(mediaTypes));
    }
    return true;
  }

  public async runHandle(action: IActorQueryOperationOutput, mediaType: string, context: ActionContext)
    : Promise<IActorSparqlSerializeOutput> {
    // Delegate handling to the mediator
    return (await this.mediatorRdfSerialize.mediate({ context,
      handle: { quads: (<IActorQueryOperationOutputQuads> action).quadStream }, handleMediaType: mediaType })).handle;
  }

  public async testMediaType(context: ActionContext): Promise<boolean> {
    return true;
  }

  public async getMediaTypes(context: ActionContext): Promise<{[id: string]: number}> {
    return (await this.mediatorMediaTypeCombiner.mediate({ context, mediaTypes: true })).mediaTypes;
  }

  public async testMediaTypeFormats(context: ActionContext): Promise<boolean> {
    return true;
  }

  public async getMediaTypeFormats(context: ActionContext): Promise<{[id: string]: string}> {
    return (await this.mediatorMediaTypeFormatCombiner.mediate({ context, mediaTypeFormats: true })).mediaTypeFormats;
  }

}

export interface IActorSparqlSerializeRdfArgs
  extends IActorArgsMediaTyped<IActionSparqlSerialize, IActorTest, IActorSparqlSerializeOutput> {
  mediatorRdfSerialize: Mediator<Actor<IActionRootRdfSerialize, IActorTestRootRdfSerialize,
    IActorOutputRootRdfSerialize>, IActionRootRdfSerialize, IActorTestRootRdfSerialize, IActorOutputRootRdfSerialize>;
  mediatorMediaTypeCombiner: Mediator<Actor<IActionRootRdfSerialize, IActorTestRootRdfSerialize,
    IActorOutputRootRdfSerialize>, IActionRootRdfSerialize, IActorTestRootRdfSerialize, IActorOutputRootRdfSerialize>;
  mediatorMediaTypeFormatCombiner: Mediator<Actor<IActionRootRdfSerialize, IActorTestRootRdfSerialize,
    IActorOutputRootRdfSerialize>, IActionRootRdfSerialize, IActorTestRootRdfSerialize, IActorOutputRootRdfSerialize>;
}
