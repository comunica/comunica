import {IActorQueryOperationOutputBindings, IActorQueryOperationOutputBoolean,
  IActorQueryOperationOutputQuads} from "@comunica/bus-query-operation";
import {ActorSparqlSerializeFixedMediaTypes, IActionSparqlSerialize,
  IActorSparqlSerializeFixedMediaTypesArgs, IActorSparqlSerializeOutput} from "@comunica/bus-sparql-serialize";
import {ActionContext} from "@comunica/core";
import * as RDF from "rdf-js";
import {Readable} from "stream";

/**
 * A comunica Simple Sparql Serialize Actor.
 */
export class ActorSparqlSerializeSimple extends ActorSparqlSerializeFixedMediaTypes {

  constructor(args: IActorSparqlSerializeFixedMediaTypesArgs) {
    super(args);
  }

  public async testHandleChecked(action: IActionSparqlSerialize, context: ActionContext) {
    if (['bindings', 'quads', 'boolean'].indexOf(action.type) < 0) {
      throw new Error('This actor can only handle bindings streams, quad streams or booleans.');
    }
    return true;
  }

  public async runHandle(action: IActionSparqlSerialize, mediaType: string, context: ActionContext)
    : Promise<IActorSparqlSerializeOutput> {
    const data = new Readable();
    data._read = () => {
      return;
    };

    let resultStream: NodeJS.EventEmitter;
    if (action.type === 'bindings') {
      resultStream = (<IActorQueryOperationOutputBindings> action).bindingsStream;
      resultStream.on('error', (e) => data.emit('error', e));
      resultStream.on('data', (bindings) => data.push(bindings.map(
        (value: RDF.Term, key: string) => key + ': ' + value.value).join('\n') + '\n\n'));
      resultStream.on('end', () => data.push(null));
    } else if (action.type === 'quads') {
      resultStream = (<IActorQueryOperationOutputQuads> action).quadStream;
      resultStream.on('error', (e) => data.emit('error', e));
      resultStream.on('data', (quad) => data.push(
        'subject: ' + quad.subject.value + '\n'
        + 'predicate: ' + quad.predicate.value + '\n'
        + 'object: ' + quad.object.value + '\n'
        + 'graph: ' + quad.graph.value + '\n\n'));
      resultStream.on('end', () => data.push(null));
    } else {
      try {
        data.push(JSON.stringify(await (<IActorQueryOperationOutputBoolean> action).booleanResult) + '\n');
        data.push(null);
      } catch (e) {
        setImmediate(() => data.emit('error', e));
      }
    }

    return { data };
  }

}
