import type { IActionSparqlSerialize,
  IActorQueryResultSerializeFixedMediaTypesArgs,
  IActorQueryResultSerializeOutput } from '@comunica/bus-query-result-serialize';
import { ActorQueryResultSerializeFixedMediaTypes } from '@comunica/bus-query-result-serialize';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { IQueryOperationResultBindings, BindingsStream, IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { Readable } from 'readable-stream';
import type { IConverterSettings, ISchema } from 'sparqljson-to-tree';
import { Converter } from 'sparqljson-to-tree';

/**
 * A comunica Tree Query Result Serialize Actor.
 */
export class ActorQueryResultSerializeTree extends ActorQueryResultSerializeFixedMediaTypes
  implements IActorQueryResultSerializeFixedMediaTypesArgs {
  /**
   * @param args -
   *   \ @defaultNested {{ "tree": 0.5 }} mediaTypePriorities
   *   \ @defaultNested {{ "tree": "https://comunica.linkeddatafragments.org/#results_tree" }} mediaTypeFormats
   */
  public constructor(args: IActorQueryResultSerializeFixedMediaTypesArgs) {
    super(args);
  }

  /**
   *
   * @param {BindingsStream} bindingsStream
   * @param context
   * @param {IConverterSettings} converterSettings
   * @return {Promise<string>}
   */
  public static bindingsStreamToGraphQl(bindingsStream: BindingsStream,
    context: IActionContext | Record<string, any> | undefined,
    converterSettings?: IConverterSettings): Promise<any> {
    const actionContext: IActionContext = ActionContext.ensureActionContext(context);
    return new Promise((resolve, reject) => {
      const bindingsArray: Record<string, RDF.Term>[] = [];
      const converter: Converter = new Converter(converterSettings);

      const schema: ISchema = {
        singularizeVariables: actionContext.get(KeysInitQuery.graphqlSingularizeVariables) || {},
      };

      bindingsStream.on('error', reject);
      bindingsStream.on('data', (bindings: RDF.Bindings) => {
        bindingsArray.push(Object.fromEntries([ ...bindings ]
          .map(([ key, value ]) => [ key.value, value ])));
      });
      bindingsStream.on('end', () => {
        resolve(converter.bindingsToTree(bindingsArray, schema));
      });
    });
  }

  public async testHandleChecked(action: IActionSparqlSerialize): Promise<boolean> {
    if (action.type !== 'bindings') {
      throw new Error('This actor can only handle bindings streams.');
    }
    return true;
  }

  public async runHandle(action: IActionSparqlSerialize, mediaType: string): Promise<IActorQueryResultSerializeOutput> {
    const data = new Readable();
    data._read = () => {
      // Do nothing
    };

    const resultStream: BindingsStream = (<IQueryOperationResultBindings> action).bindingsStream;
    resultStream.on('error', error => data.emit('error', error));
    ActorQueryResultSerializeTree.bindingsStreamToGraphQl(resultStream, action.context, { materializeRdfJsTerms: true })
      .then((result: any) => {
        data.push(JSON.stringify(result, null, '  '));
        data.push(null);
      })
      .catch(error => data.emit('error', error));

    return { data };
  }
}
