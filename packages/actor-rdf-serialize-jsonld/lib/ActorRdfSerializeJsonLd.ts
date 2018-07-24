import {ActorRdfSerializeFixedMediaTypes, IActionRdfSerialize,
  IActorRdfSerializeFixedMediaTypesArgs, IActorRdfSerializeOutput} from "@comunica/bus-rdf-serialize";
import {ActionContext} from "@comunica/core";
import * as RDF from "rdf-js";

/**
 * A comunica Jsonld RDF Serialize Actor.
 */
export class ActorRdfSerializeJsonLd extends ActorRdfSerializeFixedMediaTypes {

  /**
   * The number of spaces that should be used to indent stringified JSON.
   */
  public readonly jsonStringifyIndentSpaces: number;

  private readonly jsonLd: any;

  constructor(args: IActorRdfSerializeJsonLdArgs) {
    super(args);
    this.jsonLd = require('jsonld')();
  }

  public async runHandle(action: IActionRdfSerialize, mediaType: string, context?: ActionContext)
    : Promise<IActorRdfSerializeOutput> {
    const quadsArray: RDF.Quad = await require('arrayify-stream')(action.quads);
    const jsonLines: string[] = (await this.jsonLd.fromRDF(quadsArray, { useNativeTypes: true }))
      .map((jsonObject: any) => JSON.stringify(jsonObject, null, this.jsonStringifyIndentSpaces));
    return { data: require('streamify-array')(jsonLines) };
  }

}

export interface IActorRdfSerializeJsonLdArgs extends IActorRdfSerializeFixedMediaTypesArgs {
  jsonStringifyIndentSpaces: number;
}
