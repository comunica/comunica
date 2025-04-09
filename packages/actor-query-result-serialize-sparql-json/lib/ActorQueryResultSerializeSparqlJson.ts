import type {
  IActionSparqlSerialize,
  IActorQueryResultSerializeFixedMediaTypesArgs,
  IActorQueryResultSerializeOutput,
} from '@comunica/bus-query-result-serialize';
import { ActorQueryResultSerializeFixedMediaTypes } from '@comunica/bus-query-result-serialize';
import type { TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import type { ActionObserverHttpRequests } from '@comunica/observer-http-requests';
import type {
  IActionContext,
  IQueryOperationResultBindings,
  IQueryOperationResultBoolean,
} from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { wrap } from 'asynciterator';
import { Readable } from 'readable-stream';

/**
 * A comunica sparql-results+xml Serialize Actor.
 */
export class ActorQueryResultSerializeSparqlJson extends ActorQueryResultSerializeFixedMediaTypes {
  private readonly emitMetadata: boolean;
  private readonly httpRequestCountObserver: ActionObserverHttpRequests | undefined;

  /**
   * @param args -
   *   \ @defaultNested {{
   *       "application/sparql-results+json": 0.8
   *     }} mediaTypePriorities
   *   \ @defaultNested {{
   *       "application/sparql-results+json": "http://www.w3.org/ns/formats/SPARQL_Results_JSON"
   *     }} mediaTypeFormats
   */
  public constructor(args: IActorQueryResultSerializeSparqlJsonArgs) {
    super(args);
    this.emitMetadata = args.emitMetadata;
    this.httpRequestCountObserver = args.httpRequestCountObserver;
  }

  /**
   * Converts an RDF term to its JSON representation.
   * @param {RDF.Term} value An RDF term.
   * @return {any} A JSON object.
   */
  public static bindingToJsonBindings(value: RDF.Term): any {
    if (value.termType === 'Literal') {
      const literal: RDF.Literal = value;
      const jsonValue: any = { value: literal.value, type: 'literal' };
      const { language, datatype } = literal;
      if (language) {
        jsonValue['xml:lang'] = language;
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
    const data = new Readable();
    // Write head
    const head: any = {};
    if (action.type === 'bindings') {
      const metadata = await (<IQueryOperationResultBindings> action).metadata();
      if (metadata.variables.length > 0) {
        head.vars = metadata.variables.map(variable => variable.variable.value);
      }
    }
    data.push(`{"head": ${JSON.stringify(head)},\n`);

    if (action.type === 'bindings') {
      const resultStream = (<IQueryOperationResultBindings> action).bindingsStream;
      data.push('"results": { "bindings": [\n');

      let first = true;

      function* end(cb: () => string): Generator<string> {
        yield cb();
      }

      // Write bindings
      data.wrap(
        // JSON SPARQL results spec does not allow unbound variables and blank node bindings
        <any> wrap(resultStream).map((bindings) => {
          const res = `${first ? '' : ',\n'}${JSON.stringify(Object.fromEntries([ ...bindings ]
          .map(([ key, value ]) => [ key.value, ActorQueryResultSerializeSparqlJson.bindingToJsonBindings(value) ])))}`;
          first = false;
          return res;
        }).append(wrap(end(() => {
          const metadata = this.emitMetadata && this.httpRequestCountObserver ?
            `,\n"metadata": { "httpRequests": ${this.httpRequestCountObserver.requests} }` :
            '';
          return `\n]}${metadata}}\n`;
        }))),
      );
    } else {
      data.wrap(<any> wrap((<IQueryOperationResultBoolean> action).execute().then(value => [ `"boolean":${value}\n}\n` ])));
    }

    return { data };
  }
}

export interface IActorQueryResultSerializeSparqlJsonArgs extends IActorQueryResultSerializeFixedMediaTypesArgs {
  /**
   * Whether the serialized JSON output should contain an additional metadata entry.
   * @default {true}
   */
  emitMetadata: boolean;
  /**
   * Optional observer on the HTTP bus that counts the number of HTTP requests done by the engine.
   * This request count will then be reported in the metadata field of the results.
   */
  httpRequestCountObserver?: ActionObserverHttpRequests;
}
