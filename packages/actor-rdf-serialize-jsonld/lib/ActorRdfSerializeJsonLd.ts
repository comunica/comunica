import type { IActionRdfSerialize,
  IActorRdfSerializeFixedMediaTypesArgs,
  IActorRdfSerializeOutput } from '@comunica/bus-rdf-serialize';
import {
  ActorRdfSerializeFixedMediaTypes,
} from '@comunica/bus-rdf-serialize';
import type { ActionContext } from '@comunica/core';
import { JsonLdSerializer } from 'jsonld-streaming-serializer';

/**
 * A comunica Jsonld RDF Serialize Actor.
 */
export class ActorRdfSerializeJsonLd extends ActorRdfSerializeFixedMediaTypes {
  /**
   * The number of spaces that should be used to indent stringified JSON.
   */
  public readonly jsonStringifyIndentSpaces: number;

  public constructor(args: IActorRdfSerializeJsonLdArgs) {
    super(args);
  }

  public async runHandle(action: IActionRdfSerialize, mediaType: string, context: ActionContext):
  Promise<IActorRdfSerializeOutput> {
    const data: NodeJS.ReadableStream = <any> new JsonLdSerializer(
      { space: ' '.repeat(this.jsonStringifyIndentSpaces) },
    ).import(action.quadStream);
    return { data };
  }
}

export interface IActorRdfSerializeJsonLdArgs extends IActorRdfSerializeFixedMediaTypesArgs {
  jsonStringifyIndentSpaces: number;
}
