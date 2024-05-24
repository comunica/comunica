import type {
  IActionSparqlSerialize,
  IActorQueryResultSerializeFixedMediaTypesArgs,
  IActorQueryResultSerializeOutput,
} from '@comunica/bus-query-result-serialize';
import { ActorQueryResultSerializeFixedMediaTypes } from '@comunica/bus-query-result-serialize';
import type {
  IActionContext,
  IQueryOperationResultBindings,
  IQueryOperationResultBoolean,
  IQueryOperationResultQuads,
} from '@comunica/types';
import { wrap } from 'asynciterator';
import * as RdfString from 'rdf-string';
import { Readable } from 'readable-stream';

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

  public override async testHandleChecked(action: IActionSparqlSerialize, _context: IActionContext): Promise<boolean> {
    if (![ 'bindings', 'quads', 'boolean' ].includes(action.type)) {
      throw new Error('This actor can only handle bindings or quad streams.');
    }
    return true;
  }

  public async runHandle(action: IActionSparqlSerialize, _mediaType: string, _context: IActionContext):
  Promise<IActorQueryResultSerializeOutput> {
    const data = new Readable();
    data._read = () => {
      // Do nothing
    };

    if (action.type === 'bindings' || action.type === 'quads') {
      let stream = action.type === 'bindings' ?
        wrap((<IQueryOperationResultBindings> action).bindingsStream)
          .map(element => JSON.stringify(Object.fromEntries([ ...element ]
            .map(([ key, value ]) => [ key.value, RdfString.termToString(value) ])))) :
        wrap((<IQueryOperationResultQuads> action).quadStream)
          .map(element => JSON.stringify(RdfString.quadToStringQuad(element)));

      let empty = true;
      stream = stream.map((element) => {
        const ret = `${empty ? '' : ','}\n${element}`;
        empty = false;
        return ret;
      }).prepend([ '[' ]).append([ '\n]\n' ]);

      data.wrap(<any> stream);
    } else {
      try {
        data.push(`${JSON.stringify(await (<IQueryOperationResultBoolean> action).execute())}\n`);
        data.push(null);
      } catch (error: unknown) {
        setTimeout(() => data.emit('error', error));
      }
    }

    return { data };
  }
}
