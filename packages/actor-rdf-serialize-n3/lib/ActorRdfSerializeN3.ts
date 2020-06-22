import {
  ActorRdfSerializeFixedMediaTypes,
  IActionRdfSerialize,
  IActorRdfSerializeFixedMediaTypesArgs,
  IActorRdfSerializeOutput
} from "@comunica/bus-rdf-serialize";
import {ActionContext} from "@comunica/core";
import {StreamWriter} from "n3";

/**
 * A comunica N3 RDF Serialize Actor.
 */
export class ActorRdfSerializeN3 extends ActorRdfSerializeFixedMediaTypes {

  constructor(args: IActorRdfSerializeFixedMediaTypesArgs) {
    super(args);
  }

  public async runHandle(action: IActionRdfSerialize, mediaType: string, context: ActionContext)
    : Promise<IActorRdfSerializeOutput> {
    const data: NodeJS.ReadableStream = <any> new StreamWriter({ format: mediaType }).import(action.quadStream);
    return { data,
      triples: mediaType === 'text/turtle'
      || mediaType === 'application/n-triples'
      || mediaType === 'text/n3' };
  }

}
