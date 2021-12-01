import { Readable } from 'stream';
import type { IActionSparqlSerialize,
  IActorSparqlSerializeFixedMediaTypesArgs, IActorSparqlSerializeOutput } from '@comunica/bus-sparql-serialize';
import { ActorSparqlSerializeFixedMediaTypes } from '@comunica/bus-sparql-serialize';
import type { ActionContext, IQueryableResultBindings, IQueryableResultBoolean,
  IQueryableResultQuads, IQueryableResultVoid } from '@comunica/types';
import type * as RDF from '@rdfjs/types';

/**
 * A comunica Simple Sparql Serialize Actor.
 */
export class ActorSparqlSerializeSimple extends ActorSparqlSerializeFixedMediaTypes {
  /**
   * @param args -
   *   \ @defaultNested {{ "simple": 0.9 }} mediaTypePriorities
   *   \ @defaultNested {{ "simple": "https://comunica.linkeddatafragments.org/#results_simple" }} mediaTypeFormats
   */
  public constructor(args: IActorSparqlSerializeFixedMediaTypesArgs) {
    super(args);
  }

  public async testHandleChecked(action: IActionSparqlSerialize, context: ActionContext): Promise<boolean> {
    if (![ 'bindings', 'quads', 'boolean', 'update' ].includes(action.type)) {
      throw new Error('This actor can only handle bindings streams, quad streams, booleans, or updates.');
    }
    return true;
  }

  public async runHandle(action: IActionSparqlSerialize, mediaType: string, context: ActionContext):
  Promise<IActorSparqlSerializeOutput> {
    const data = new Readable();
    data._read = () => {
      // Do nothing
    };

    let resultStream: NodeJS.EventEmitter;
    if (action.type === 'bindings') {
      resultStream = (<IQueryableResultBindings> action).bindingsStream;
      resultStream.on('error', error => data.emit('error', error));
      resultStream.on('data', bindings => data.push(`${bindings.map(
        (value: RDF.Term, key: string) => `${key}: ${value.value}`,
      ).join('\n')}\n\n`));
      resultStream.on('end', () => data.push(null));
    } else if (action.type === 'quads') {
      resultStream = (<IQueryableResultQuads> action).quadStream;
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
        data.push(`${JSON.stringify(await (<IQueryableResultBoolean> action).booleanResult)}\n`);
        data.push(null);
      } catch (error: unknown) {
        setImmediate(() => data.emit('error', error));
      }
    } else {
      (<IQueryableResultVoid> action).updateResult
        .then(() => {
          data.push('ok\n');
          data.push(null);
        })
        .catch(error => setImmediate(() => data.emit('error', error)));
    }

    return { data };
  }
}
