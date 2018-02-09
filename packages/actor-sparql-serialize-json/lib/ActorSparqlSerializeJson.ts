import {ActorSparqlSerializeFixedMediaTypes, IActionSparqlSerialize,
  IActorSparqlSerializeFixedMediaTypesArgs, IActorSparqlSerializeOutput} from "@comunica/bus-sparql-serialize";
import * as RdfString from "rdf-string";
import {Readable} from "stream";

/**
 * A comunica JSON SPARQL Serialize Actor.
 */
export class ActorSparqlSerializeJson extends ActorSparqlSerializeFixedMediaTypes {

  constructor(args: IActorSparqlSerializeFixedMediaTypesArgs) {
    super(args);
  }

  public async testHandleChecked(action: IActionSparqlSerialize) {
    if (['bindings', 'quads'].indexOf(action.type) < 0) {
      throw new Error('This actor can only handle bindings or quad streams.');
    }
    return true;
  }

  public async runHandle(action: IActionSparqlSerialize, mediaType: string): Promise<IActorSparqlSerializeOutput> {
    const data = new Readable();
    data._read = () => {
      return;
    };
    data.push('[');

    let empty: boolean = true;
    let resultStream: NodeJS.EventEmitter;
    if (action.type === 'bindings') {
      resultStream = action.bindingsStream;
      resultStream.on('data', (element) => {
        data.push(empty ? '\n' : ',\n');
        data.push(JSON.stringify(element.map(RdfString.termToString)).trim());
        empty = false;
      });
    } else {
      resultStream = action.quadStream;
      resultStream.on('data', (element) => {
        data.push(empty ? '\n' : ',\n');
        data.push(JSON.stringify(RdfString.quadToStringQuad(element)).trim());
        empty = false;
      });
    }

    resultStream.on('end', () => {
      data.push(empty ? ']\n' : '\n]\n');
      data.push(null);
    });

    return { data };
  }

}
