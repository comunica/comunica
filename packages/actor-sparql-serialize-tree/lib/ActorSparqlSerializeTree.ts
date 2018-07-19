import {IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {ActorSparqlSerializeFixedMediaTypes, IActionSparqlSerialize,
  IActorSparqlSerializeFixedMediaTypesArgs, IActorSparqlSerializeOutput} from "@comunica/bus-sparql-serialize";
import * as RDF from "rdf-js";
import {Converter, ISchema} from "sparqljson-to-tree";
import {Readable} from "stream";

/**
 * A comunica Tree SPARQL Serialize Actor.
 */
export class ActorSparqlSerializeTree extends ActorSparqlSerializeFixedMediaTypes
  implements IActorSparqlSerializeFixedMediaTypesArgs {

  private readonly converter: Converter;

  constructor(args: IActorSparqlSerializeFixedMediaTypesArgs) {
    super(args);
    this.converter = new Converter({ materializeRdfJsTerms: true });
  }

  public async testHandleChecked(action: IActionSparqlSerialize) {
    if (action.type !== 'bindings') {
      throw new Error('This actor can only handle bindings streams.');
    }
    return true;
  }

  public async runHandle(action: IActionSparqlSerialize, mediaType: string): Promise<IActorSparqlSerializeOutput> {
    const data = new Readable();
    data._read = () => {
      return;
    };

    const bindingsArray: {[key: string]: RDF.Term}[] = [];
    const schema: ISchema = { singularizeVariables: {} };
    if (action.context && action.context['@context']) {
      for (const key of Object.keys(action.context['@context'])) {
        if (action.context['@context'][key]['@singular']) {
          schema.singularizeVariables[key] = true;
        }
      }
    }

    const resultStream: NodeJS.EventEmitter = (<IActorQueryOperationOutputBindings> action).bindingsStream;
    resultStream.on('error', (e) => data.emit('error', e));
    resultStream.on('data', (bindings) => {
      const rawBindings = bindings.toJS();
      const reKeyedBindings: {[key: string]: RDF.Term} = {};
      // Removes the '?' prefix
      for (const key in rawBindings) {
        const bindingValue = rawBindings[key];
        if (bindingValue) {
          reKeyedBindings[key.substr(1)] = bindingValue;
        }
      }
      bindingsArray.push(reKeyedBindings);
    });
    resultStream.on('end', () => {
      data.push(JSON.stringify(this.converter.bindingsToTree(bindingsArray, schema), null, '  '));
      data.push(null);
    });

    return { data };
  }

}
