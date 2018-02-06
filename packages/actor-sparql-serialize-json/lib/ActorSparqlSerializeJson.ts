import {ActorSparqlSerializeFixedMediaTypes, IActionSparqlSerialize,
  IActorSparqlSerializeFixedMediaTypesArgs, IActorSparqlSerializeOutput} from "@comunica/bus-sparql-serialize";
import {Readable} from "stream";

/**
 * A comunica JSON SPARQL Serialize Actor.
 */
export class ActorSparqlSerializeJson extends ActorSparqlSerializeFixedMediaTypes {

  constructor(args: IActorSparqlSerializeFixedMediaTypesArgs) {
    super(args);
  }

  public async runHandle(action: IActionSparqlSerialize, mediaType: string): Promise<IActorSparqlSerializeOutput> {
    const data = new Readable();
    data._read = () => {
      return;
    };
    let empty: boolean = true;
    const resultStream: NodeJS.EventEmitter = action.bindingsStream || action.quadStream;

    data.push('[');
    resultStream.on('data', (element) => {
      data.push(empty ? '\n' : ',\n');
      data.push(JSON.stringify(element).trim());
      empty = false;
    });
    resultStream.on('end', () => {
      data.push(empty ? ']\n' : '\n]\n');
      data.push(null);
    });

    return { data };
  }

}
