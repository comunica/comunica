import {
  ActorRdfSerializeFixedMediaTypes,
  IActionRdfSerialize,
  IActorRdfSerializeFixedMediaTypesArgs,
  IActorRdfSerializeOutput,
} from "@comunica/bus-rdf-serialize";
import {ActionContext} from "@comunica/core";
import {JsonLdSerializer} from "jsonld-streaming-serializer";

/**
 * A comunica Jsonld RDF Serialize Actor.
 */
export class ActorRdfSerializeJsonLd extends ActorRdfSerializeFixedMediaTypes {

  /**
   * The number of spaces that should be used to indent stringified JSON.
   */
  public readonly jsonStringifyIndentSpaces: number;

  constructor(args: IActorRdfSerializeJsonLdArgs) {
    super(args);
  }

  public async runHandle(action: IActionRdfSerialize, mediaType: string, context: ActionContext)
    : Promise<IActorRdfSerializeOutput> {
    const data: NodeJS.ReadableStream = <any> new JsonLdSerializer(
      { space: ' '.repeat(this.jsonStringifyIndentSpaces) }).import(action.quads);
    return { data };
  }

}

export interface IActorRdfSerializeJsonLdArgs extends IActorRdfSerializeFixedMediaTypesArgs {
  jsonStringifyIndentSpaces: number;
}
