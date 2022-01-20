import { Readable } from 'stream';
import type { IActionSparqlSerialize,
  IActorQueryResultSerializeFixedMediaTypesArgs,
  IActorQueryResultSerializeOutput } from '@comunica/bus-query-result-serialize';
import { ActorQueryResultSerializeFixedMediaTypes } from '@comunica/bus-query-result-serialize';
import type {
  IActionContext, IQueryableResultBindings, IQueryableResultBoolean,
  IQueryableResultQuads,
} from '@comunica/types';
import * as RdfString from 'rdf-string';

/**
 * A comunica JSON Query Result Serialize Actor.
 */
export class ActorQueryResultSerializeJson extends ActorQueryResultSerializeFixedMediaTypes {
  /**
   * @param args -
   *   \ @defaultNested {{
   *       "application/json": 1.0
   *     }} mediaTypePriorities
   *   \ @defaultNested {{
   *       "application/json": "https://comunica.linkeddatafragments.org/#results_JSON"
   *     }} mediaTypeFormats
   */
  public constructor(args: IActorQueryResultSerializeFixedMediaTypesArgs) {
    super(args);
  }

  public async testHandleChecked(action: IActionSparqlSerialize, context: IActionContext): Promise<boolean> {
    if (![ 'bindings', 'quads', 'boolean' ].includes(action.type)) {
      throw new Error('This actor can only handle bindings or quad streams.');
    }
    return true;
  }

  public async runHandle(action: IActionSparqlSerialize, mediaType: string, context: IActionContext):
  Promise<IActorQueryResultSerializeOutput> {
    const data = new Readable();
    data._read = () => {
      // Do nothing
    };

    let empty = true;
    if (action.type === 'bindings') {
      const resultStream = (<IQueryableResultBindings> action).bindingsStream;
      data.push('[');
      resultStream.on('error', error => data.emit('error', error));
      resultStream.on('data', element => {
        data.push(empty ? '\n' : ',\n');
        data.push(JSON.stringify(element.map(RdfString.termToString)));
        empty = false;
      });
      resultStream.on('end', () => {
        data.push(empty ? ']\n' : '\n]\n');
        data.push(null);
      });
    } else if (action.type === 'quads') {
      const resultStream = (<IQueryableResultQuads> action).quadStream;
      data.push('[');
      resultStream.on('error', error => data.emit('error', error));
      resultStream.on('data', element => {
        data.push(empty ? '\n' : ',\n');
        data.push(JSON.stringify(RdfString.quadToStringQuad(element)));
        empty = false;
      });
      resultStream.on('end', () => {
        data.push(empty ? ']\n' : '\n]\n');
        data.push(null);
      });
    } else {
      try {
        data.push(`${JSON.stringify(await (<IQueryableResultBoolean> action).booleanResult)}\n`);
        data.push(null);
      } catch (error: unknown) {
        setImmediate(() => data.emit('error', error));
      }
    }

    return { data };
  }
}
