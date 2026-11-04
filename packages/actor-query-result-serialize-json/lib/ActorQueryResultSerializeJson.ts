import type {
  IActionSparqlSerialize,
  IActorQueryResultSerializeFixedMediaTypesArgs,
  IActorQueryResultSerializeOutput,
} from '@comunica/bus-query-result-serialize';
import { ActorQueryResultSerializeFixedMediaTypes } from '@comunica/bus-query-result-serialize';
import type { TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import type {
  Bindings,
  IActionContext,
  IQueryOperationResultBindings,
  IQueryOperationResultBoolean,
  IQueryOperationResultQuads,
} from '@comunica/types';
import type { AsyncIterator } from 'asynciterator';
import { wrap } from 'asynciterator';
import * as RdfString from 'rdf-string';
import { Readable } from 'readable-stream';

/**
 * A comunica JSON Query Result Serialize Actor.
 */
export class ActorQueryResultSerializeJson extends ActorQueryResultSerializeFixedMediaTypes {
  /**
   * The length after which a chunk of serialized elements is pushed.
   */
  public static readonly MAX_CHUNK_LENGTH = 65_536;

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

  public override async testHandleChecked(
    action: IActionSparqlSerialize,
    _context: IActionContext,
  ): Promise<TestResult<boolean>> {
    if (![ 'bindings', 'quads', 'boolean' ].includes(action.type)) {
      return failTest('This actor can only handle bindings or quad streams.');
    }
    return passTestVoid();
  }

  public async runHandle(action: IActionSparqlSerialize, _mediaType: string, _context: IActionContext):
  Promise<IActorQueryResultSerializeOutput> {
    if (action.type === 'bindings') {
      return { data: ActorQueryResultSerializeJson.serializeElements(
        wrap((<IQueryOperationResultBindings> action).bindingsStream),
        ActorQueryResultSerializeJson.bindingsToJson,
      ) };
    }
    if (action.type === 'quads') {
      return { data: ActorQueryResultSerializeJson.serializeElements(
        wrap((<IQueryOperationResultQuads> action).quadStream),
        quad => JSON.stringify(RdfString.quadToStringQuad(quad)),
      ) };
    }

    const data = new Readable();
    data._read = () => {
      // Do nothing
    };
    try {
      data.push(`${JSON.stringify(await (<IQueryOperationResultBoolean> action).execute())}\n`);
      data.push(null);
    } catch (error: unknown) {
      setTimeout(() => data.emit('error', error));
    }
    return { data };
  }

  /**
   * Create a stream of the given elements as a JSON array.
   * All elements that are available when the stream is read are serialized into a single chunk,
   * which is cheaper than handling every element as a separate chunk.
   * @param stream A stream of elements.
   * @param serialize Serializes an element into JSON.
   */
  public static serializeElements<T>(stream: AsyncIterator<T>, serialize: (element: T) => string): Readable {
    let first = true;
    let pending = false;
    const pull = (): void => {
      pending = false;
      let chunk = '';
      while (chunk.length < ActorQueryResultSerializeJson.MAX_CHUNK_LENGTH) {
        const element = stream.read();
        if (element === null) {
          break;
        }
        chunk += first ? '[\n' : ',\n';
        chunk += serialize(element);
        first = false;
      }
      if (chunk.length < ActorQueryResultSerializeJson.MAX_CHUNK_LENGTH && stream.done) {
        data.push(`${first ? '[' : chunk}\n]\n`);
        data.push(null);
      } else if (chunk.length > 0) {
        data.push(chunk);
      } else {
        // Continue once more elements are available, or the stream has ended
        pending = true;
      }
    };
    const data = new Readable({ read: pull });
    const pullIfPending = (): void => {
      if (pending) {
        pull();
      }
    };
    stream.on('readable', pullIfPending);
    stream.on('end', pullIfPending);
    stream.on('error', (error: Error) => data.destroy(error));
    return data;
  }

  /**
   * Serialize bindings into a JSON object of terms in their string representation, by variable name.
   * @param bindings Bindings.
   */
  public static bindingsToJson(bindings: Bindings): string {
    const json: Record<string, string> = {};
    for (const [ key, value ] of bindings) {
      json[key.value] = RdfString.termToString(value);
    }
    return JSON.stringify(json);
  }
}
