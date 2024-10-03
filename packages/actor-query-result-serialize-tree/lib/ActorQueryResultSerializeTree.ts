import type {
  IActionSparqlSerialize,
  IActorQueryResultSerializeFixedMediaTypesArgs,
  IActorQueryResultSerializeOutput,
} from '@comunica/bus-query-result-serialize';
import { ActorQueryResultSerializeFixedMediaTypes } from '@comunica/bus-query-result-serialize';
import { KeysInitQuery } from '@comunica/context-entries';
import type { TestResult } from '@comunica/core';
import { ActionContext, failTest, passTestVoid } from '@comunica/core';
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
  public static async bindingsStreamToGraphQl(
    bindingsStream: BindingsStream,
    context: IActionContext | Record<string, any> | undefined,
    converterSettings?: IConverterSettings,
  ): Promise<any> {
    const actionContext: IActionContext = ActionContext.ensureActionContext(context);
    const converter: Converter = new Converter(converterSettings);
    const schema: ISchema = {
      singularizeVariables: actionContext.get(KeysInitQuery.graphqlSingularizeVariables) ?? {},
    };

    return converter.bindingsToTree(await bindingsStream.map((bindings: RDF.Bindings) =>
      Object.fromEntries([ ...bindings ]
        .map(([ key, value ]) => [ key.value, value ]))).toArray(), schema);
  }

  public override async testHandleChecked(action: IActionSparqlSerialize): Promise<TestResult<boolean>> {
    if (action.type !== 'bindings') {
      return failTest('This actor can only handle bindings streams.');
    }
    return passTestVoid();
  }

  public async runHandle(
    action: IActionSparqlSerialize,
    _mediaType: string,
  ): Promise<IActorQueryResultSerializeOutput> {
    const data = new Readable();
    data._read = () => {
      data._read = () => { /* Do nothing */ };
      ActorQueryResultSerializeTree.bindingsStreamToGraphQl(
        (<IQueryOperationResultBindings> action).bindingsStream,
        action.context,
        { materializeRdfJsTerms: true },
      )
        .then((result: any) => {
          data.push(JSON.stringify(result, null, '  '));
          data.push(null);
        })
        .catch(error => data.emit('error', error));
    };

    return { data };
  }
}
