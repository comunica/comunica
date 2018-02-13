import {IActorArgsMediaTyped} from "@comunica/actor-abstract-mediatyped";
import {IActorQueryOperationOutput, IActorQueryOperationOutputQuads} from "@comunica/bus-query-operation";
import {IActionRootRdfSerialize, IActorOutputRootRdfSerialize,
  IActorTestRootRdfSerialize} from "@comunica/bus-rdf-serialize";
import {ActorSparqlSerialize, IActionSparqlSerialize,
  IActorSparqlSerializeOutput} from "@comunica/bus-sparql-serialize";
import {Actor, IActorTest, Mediator} from "@comunica/core";

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

  constructor(args: IActorSparqlSerializeRdfArgs) {
    super(args);
  }

  public async testHandle(action: IActorQueryOperationOutput, mediaType: string): Promise<IActorTest> {
    // Check if we are provided with a quad stream
    if (action.type !== 'quads') {
      throw new Error('Actor ' + this.name + ' can only handle quad streams');
    }

    // Check if the given media type can be handled
    const mediaTypes: {[id: string]: number} = (await this.mediatorMediaTypeCombiner.mediate({ mediaTypes: true }))
      .mediaTypes;
    if (!(mediaType in mediaTypes)) {
      throw new Error('Actor ' + this.name + ' can not handle media type ' + mediaType + '. All available types: '
      + Object.keys(mediaTypes));
    }
    return true;
  }

  public async runHandle(action: IActorQueryOperationOutput, mediaType: string): Promise<IActorSparqlSerializeOutput> {
    // Delegate handling to the mediator
    return (await this.mediatorRdfSerialize.mediate(
      { handle: { quads: (<IActorQueryOperationOutputQuads> action).quadStream }, handleMediaType: mediaType })).handle;
  }

  public async testMediaType(): Promise<boolean> {
    return true;
  }

  public async getMediaTypes(): Promise<{[id: string]: number}> {
    return (await this.mediatorMediaTypeCombiner.mediate({ mediaTypes: true })).mediaTypes;
  }

}

export interface IActorSparqlSerializeRdfArgs
  extends IActorArgsMediaTyped<IActionSparqlSerialize, IActorTest, IActorSparqlSerializeOutput> {
  mediatorRdfSerialize: Mediator<Actor<IActionRootRdfSerialize, IActorTestRootRdfSerialize,
    IActorOutputRootRdfSerialize>, IActionRootRdfSerialize, IActorTestRootRdfSerialize, IActorOutputRootRdfSerialize>;
  mediatorMediaTypeCombiner: Mediator<Actor<IActionRootRdfSerialize, IActorTestRootRdfSerialize,
    IActorOutputRootRdfSerialize>, IActionRootRdfSerialize, IActorTestRootRdfSerialize, IActorOutputRootRdfSerialize>;
}
