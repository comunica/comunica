import {ActorSparqlSerializeFixedMediaTypes, IActionSparqlSerialize,
  IActorSparqlSerializeFixedMediaTypesArgs, IActorSparqlSerializeOutput} from "@comunica/bus-sparql-serialize";
import * as RDF from "rdf-js";
import {Readable} from "stream";

/**
 * A comunica Simple Sparql Serialize Actor.
 */
export class ActorSparqlSerializeSimple extends ActorSparqlSerializeFixedMediaTypes {

  constructor(args: IActorSparqlSerializeFixedMediaTypesArgs) {
    super(args);
  }

  public async runHandle(action: IActionSparqlSerialize, mediaType: string): Promise<IActorSparqlSerializeOutput> {
    const data = new Readable();
    data._read = () => {
      return;
    };

    let resultStream: NodeJS.EventEmitter;
    if (action.bindingsStream) {
      resultStream = action.bindingsStream;
      resultStream.on('data', (bindings) => data.push(bindings.map(
        (value: RDF.Term, key: string) => key + ': ' + value.value).join('\n') + '\n\n'));
    } else {
      resultStream = action.quadStream;
      resultStream.on('data', (quad) => data.push(
        'subject: ' + quad.subject.value + '\n'
        + 'predicate: ' + quad.predicate.value + '\n'
        + 'object: ' + quad.object.value + '\n'
        + 'graph: ' + quad.graph.value + '\n\n'));
    }
    resultStream.on('end', () => data.push(null));

    return { data };
  }

}
