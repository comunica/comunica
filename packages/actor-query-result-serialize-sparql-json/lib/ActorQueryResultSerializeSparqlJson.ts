import type {
  IActionSparqlSerialize,
  IActorQueryResultSerializeFixedMediaTypesArgs,
  IActorQueryResultSerializeOutput,
} from '@comunica/bus-query-result-serialize';
import { ActorQueryResultSerializeFixedMediaTypes } from '@comunica/bus-query-result-serialize';
import type { TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import type {
  IActionContext,
  IQueryOperationResultBindings,
  IQueryOperationResultBoolean,
} from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { wrap } from 'asynciterator';
import { Readable } from 'readable-stream';
import type { ActionObserverHttp } from './ActionObserverHttp';

/**
 * A comunica sparql-results+xml Serialize Actor.
 */
export class ActorQueryResultSerializeSparqlJson extends ActorQueryResultSerializeFixedMediaTypes {
  /**
   * The length after which a chunk of serialized bindings is pushed,
   * so that large results that are available at once are still streamed.
   */
  public static readonly MAX_CHUNK_LENGTH = 65_536;

  private readonly emitMetadata: boolean;
  public readonly httpObserver: ActionObserverHttp;

  /* eslint-disable max-len */
  /**
   * @param args -
   *   \ @defaultNested {{
   *       "application/sparql-results+json": 0.8
   *     }} mediaTypePriorities
   *   \ @defaultNested {{
   *       "application/sparql-results+json": "http://www.w3.org/ns/formats/SPARQL_Results_JSON"
   *     }} mediaTypeFormats
   *   \ @defaultNested {true} emitMetadata
   *   \ @defaultNested {<default_observer> a <caqrssj:components/ActionObserverHttp.jsonld#ActionObserverHttp>} httpObserver
   */
  public constructor(args: IActorQueryResultSerializeSparqlJsonArgs) {
    super(args);
    this.emitMetadata = args.emitMetadata;
    this.httpObserver = args.httpObserver;
  }
  /* eslint-enable max-len */

  /**
   * Converts an RDF term to its JSON representation.
   * @param {RDF.Term} value An RDF term.
   * @return {any} A JSON object.
   */
  public static bindingToJsonBindings(value: RDF.Term): any {
    if (value.termType === 'Literal') {
      const literal: RDF.Literal = value;
      const jsonValue: any = { value: literal.value, type: 'literal' };
      const { language, direction, datatype } = literal;
      if (language) {
        jsonValue['xml:lang'] = language;
        if (direction) {
          jsonValue['its:dir'] = direction;
        }
      } else if (datatype && datatype.value !== 'http://www.w3.org/2001/XMLSchema#string') {
        jsonValue.datatype = datatype.value;
      }
      return jsonValue;
    }
    if (value.termType === 'BlankNode') {
      return { value: value.value, type: 'bnode' };
    }
    if (value.termType === 'Quad') {
      return {
        value: {
          subject: ActorQueryResultSerializeSparqlJson.bindingToJsonBindings(value.subject),
          predicate: ActorQueryResultSerializeSparqlJson.bindingToJsonBindings(value.predicate),
          object: ActorQueryResultSerializeSparqlJson.bindingToJsonBindings(value.object),
        },
        type: 'triple',
      };
    }
    return { value: value.value, type: 'uri' };
  }

  public override async testHandleChecked(
    action: IActionSparqlSerialize,
    _context: IActionContext,
  ): Promise<TestResult<boolean>> {
    if (![ 'bindings', 'boolean' ].includes(action.type)) {
      return failTest('This actor can only handle bindings streams or booleans.');
    }
    return passTestVoid();
  }

  public async runHandle(action: IActionSparqlSerialize, _mediaType: string | undefined, _context: IActionContext):
  Promise<IActorQueryResultSerializeOutput> {
    // Write head
    const head: any = {};
    if (action.type === 'bindings') {
      const metadata = await (<IQueryOperationResultBindings> action).metadata();
      if (metadata.variables.length > 0) {
        head.vars = metadata.variables.map(variable => variable.variable.value);
      }
    }
    const start = `{"head": ${JSON.stringify(head)},\n`;

    if (action.type === 'bindings') {
      const data = this.serializeBindings(wrap((<IQueryOperationResultBindings> action).bindingsStream));
      data.push(`${start}"results": { "bindings": [\n`);
      return { data };
    }
    const data = new Readable();
    data.push(start);
    data.wrap(<any> wrap((<IQueryOperationResultBoolean> action).execute().then(value => [ `"boolean":${value}\n}\n` ])));
    return { data };
  }

  /**
   * Create a stream of the serialized bindings, followed by the end of the document.
   * All bindings that are available when the stream is read are serialized into a single chunk,
   * which is cheaper than handling every binding as a separate chunk.
   * @param bindingsStream A bindings stream.
   */
  public serializeBindings(bindingsStream: AsyncIterator<RDF.Bindings>): Readable {
    let first = true;
    let pending = false;
    const pull = (): void => {
      pending = false;
      let chunk = '';
      while (chunk.length < ActorQueryResultSerializeSparqlJson.MAX_CHUNK_LENGTH) {
        const bindings = bindingsStream.read();
        if (bindings === null) {
          break;
        }
        chunk += first ? '' : ',\n';
        chunk += ActorQueryResultSerializeSparqlJson.bindingsToJson(bindings);
        first = false;
      }
      if (chunk.length < ActorQueryResultSerializeSparqlJson.MAX_CHUNK_LENGTH && bindingsStream.done) {
        data.push(`${chunk}\n]}${this.emitMetadata ? `,\n"metadata": { "httpRequests": ${this.httpObserver.requests} }` : ''}}\n`);
        data.push(null);
      } else if (chunk.length > 0) {
        data.push(chunk);
      } else {
        // Continue once more bindings are available, or the stream has ended
        pending = true;
      }
    };
    const data = new Readable({ read: pull });
    const pullIfPending = (): void => {
      if (pending) {
        pull();
      }
    };
    bindingsStream.on('readable', pullIfPending);
    bindingsStream.on('end', pullIfPending);
    bindingsStream.on('error', (error: Error) => data.destroy(error));
    return data;
  }

  /**
   * Serialize bindings into a SPARQL JSON results object.
   * The JSON SPARQL results spec does not allow unbound variables, which bindings do not contain.
   * @param bindings Bindings.
   */
  public static bindingsToJson(bindings: RDF.Bindings): string {
    const json: Record<string, any> = {};
    for (const [ key, value ] of bindings) {
      json[key.value] = ActorQueryResultSerializeSparqlJson.bindingToJsonBindings(value);
    }
    return JSON.stringify(json);
  }
}

export interface IActorQueryResultSerializeSparqlJsonArgs extends IActorQueryResultSerializeFixedMediaTypesArgs {
  emitMetadata: boolean;
  httpObserver: ActionObserverHttp;
}
