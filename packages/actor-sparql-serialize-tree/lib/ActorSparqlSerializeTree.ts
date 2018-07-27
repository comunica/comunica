import {IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {BindingsStream} from "@comunica/bus-query-operation";
import {ActorSparqlSerializeFixedMediaTypes, IActionSparqlSerialize,
  IActorSparqlSerializeFixedMediaTypesArgs, IActorSparqlSerializeOutput} from "@comunica/bus-sparql-serialize";
import {ActionContext} from "@comunica/core";
import * as RDF from "rdf-js";
import {Converter, IConverterSettings, ISchema} from "sparqljson-to-tree";
import {Readable} from "stream";

/**
 * A comunica Tree SPARQL Serialize Actor.
 */
export class ActorSparqlSerializeTree extends ActorSparqlSerializeFixedMediaTypes
  implements IActorSparqlSerializeFixedMediaTypesArgs {

  constructor(args: IActorSparqlSerializeFixedMediaTypesArgs) {
    super(args);
  }

  /**
   *
   * @param {BindingsStream} bindingsStream
   * @param context
   * @param {IConverterSettings} converterSettings
   * @return {Promise<string>}
   */
  public static bindingsStreamToGraphQl(bindingsStream: BindingsStream, context?: ActionContext,
                                        converterSettings?: IConverterSettings): Promise<string> {
    return new Promise((resolve, reject) => {
      const bindingsArray: {[key: string]: RDF.Term}[] = [];
      const converter: Converter = new Converter(converterSettings);

      const schema: ISchema = { singularizeVariables: {} };
      if (context && context.has('@context')) {
        for (const key of Object.keys(context.get('@context'))) {
          if (context.get('@context')[key]['@singular']) {
            schema.singularizeVariables[key] = true;
          }
        }
      }

      bindingsStream.on('error', reject);
      bindingsStream.on('data', (bindings) => {
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
      bindingsStream.on('end', () => {
        resolve(converter.bindingsToTree(bindingsArray, schema));
      });
    });
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

    const resultStream: BindingsStream = (<IActorQueryOperationOutputBindings> action).bindingsStream;
    resultStream.on('error', (e) => data.emit('error', e));
    ActorSparqlSerializeTree.bindingsStreamToGraphQl(resultStream, action.context, { materializeRdfJsTerms: true })
      .then((result: any) => {
        data.push(JSON.stringify(result, null, '  '));
        data.push(null);
      });

    return { data };
  }

}
