import type { IActionSparqlSerialize,
  IActorQueryResultSerializeFixedMediaTypesArgs,
  IActorQueryResultSerializeOutput } from '@comunica/bus-query-result-serialize';
import { ActorQueryResultSerializeFixedMediaTypes } from '@comunica/bus-query-result-serialize';
import type { IActionContext, IQueryOperationResultBindings, IQueryOperationResultBoolean,
  IQueryOperationResultQuads, IQueryOperationResultVoid } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { Readable } from 'readable-stream';

/**
 * A comunica Simple Sparql Serialize Actor.
 */
export class ActorQueryResultSerializeSimple extends ActorQueryResultSerializeFixedMediaTypes {
  /**
   * @param args -
   *   \ @defaultNested {{ "simple": 0.9 }} mediaTypePriorities
   *   \ @defaultNested {{ "simple": "https://comunica.linkeddatafragments.org/#results_simple" }} mediaTypeFormats
   */
  public constructor(args: IActorQueryResultSerializeFixedMediaTypesArgs) {
    super(args);
  }

  public async testHandleChecked(action: IActionSparqlSerialize, context: IActionContext): Promise<boolean> {
    if (![ 'bindings', 'quads', 'boolean', 'void' ].includes(action.type)) {
      throw new Error('This actor can only handle bindings streams, quad streams, booleans, or updates.');
    }
    return true;
  }

  public async runHandle(action: IActionSparqlSerialize, mediaType: string, context: IActionContext):
  Promise<IActorQueryResultSerializeOutput> {
    const data = new Readable();
    data._read = () => {
      // Do nothing
    };

    let resultStream: NodeJS.EventEmitter;
    if (action.type === 'bindings') {
      resultStream = (<IQueryOperationResultBindings> action).bindingsStream;
      resultStream.on('error', error => data.emit('error', error));
      resultStream.on('data', (bindings: RDF.Bindings) => data.push(`${[ ...bindings ].map(
        ([ key, value ]) => `?${key.value}: ${value.value}`,
      ).join('\n')}\n\n`));
      resultStream.on('end', () => data.push(null));
    } else if (action.type === 'quads') {
      resultStream = (<IQueryOperationResultQuads> action).quadStream;
      resultStream.on('error', error => data.emit('error', error));
      resultStream.on('data', quad => data.push(
        `subject: ${quad.subject.value}\n` +
        `predicate: ${quad.predicate.value}\n` +
        `object: ${quad.object.value}\n` +
        `graph: ${quad.graph.value}\n\n`,
      ));
      resultStream.on('end', () => data.push(null));
    } else if (action.type === 'boolean') {
      try {
        data.push(`${JSON.stringify(await (<IQueryOperationResultBoolean> action).execute())}\n`);
        data.push(null);
      } catch (error: unknown) {
        setTimeout(() => data.emit('error', error));
      }
    } else {
      (<IQueryOperationResultVoid> action).execute()
        .then(() => {
          data.push('ok\n');
          data.push(null);
        })
        .catch(error => setTimeout(() => data.emit('error', error)));
    }

    return { data };
  }
}
