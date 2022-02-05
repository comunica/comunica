import { Readable } from 'stream';
import type { IActionSparqlSerialize,
  IActorQueryResultSerializeFixedMediaTypesArgs,
  IActorQueryResultSerializeOutput } from '@comunica/bus-query-result-serialize';
import { ActorQueryResultSerializeFixedMediaTypes } from '@comunica/bus-query-result-serialize';
import type {
  Bindings, IActionContext, IQueryOperationResultBindings,
  IQueryOperationResultBoolean,
} from '@comunica/types';
import type * as RDF from '@rdfjs/types';

/**
 * A comunica sparql-results+xml Serialize Actor.
 */
export class ActorQueryResultSerializeSparqlJson extends ActorQueryResultSerializeFixedMediaTypes {
  /**
   * @param args -
   *   \ @defaultNested {{
   *       "application/sparql-results+json": 0.8
   *     }} mediaTypePriorities
   *   \ @defaultNested {{
   *       "application/sparql-results+json": "http://www.w3.org/ns/formats/SPARQL_Results_JSON"
   *     }} mediaTypeFormats
   */
  public constructor(args: IActorQueryResultSerializeFixedMediaTypesArgs) {
    super(args);
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
      const { language } = literal;
      const { datatype } = literal;
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
    return { value: value.value, type: 'uri' };
  }

  public async testHandleChecked(action: IActionSparqlSerialize, context: IActionContext): Promise<boolean> {
    if (![ 'bindings', 'boolean' ].includes(action.type)) {
      throw new Error('This actor can only handle bindings streams or booleans.');
    }
    return true;
  }

  public async runHandle(action: IActionSparqlSerialize, mediaType: string | undefined, context: IActionContext):
  Promise<IActorQueryResultSerializeOutput> {
    const data = new Readable();
    data._read = () => {
      // Do nothing
    };

    // Write head
    const head: any = {};
    if (action.type === 'bindings' && (<IQueryOperationResultBindings> action).variables.length > 0) {
      head.vars = (<IQueryOperationResultBindings> action).variables.map(variable => variable.value);
    }
    data.push(`{"head": ${JSON.stringify(head)},\n`);
    let empty = true;

    if (action.type === 'bindings') {
      const resultStream: NodeJS.EventEmitter = (<IQueryOperationResultBindings> action).bindingsStream;

      // Write bindings
      resultStream.on('error', (error: Error) => {
        data.emit('error', error);
      });
      resultStream.on('data', (bindings: Bindings) => {
        if (empty) {
          data.push('"results": { "bindings": [\n');
        } else {
          data.push(',\n');
        }

        // JSON SPARQL results spec does not allow unbound variables and blank node bindings
        data.push(JSON.stringify(Object.fromEntries([ ...bindings ]
          .map(([ key, value ]) => [ key.value, ActorQueryResultSerializeSparqlJson.bindingToJsonBindings(value) ]))));
        empty = false;
      });

      // Close streams
      resultStream.on('end', () => {
        if (empty) {
          data.push('"results": { "bindings": [] }}\n');
        } else {
          data.push('\n]}}\n');
        }
        data.push(null);
      });
    } else {
      try {
        data.push(`"boolean":${await (<IQueryOperationResultBoolean> action).booleanResult}\n}\n`);
        data.push(null);
      } catch (error: unknown) {
        data.once('newListener', () => data.emit('error', error));
      }
    }

    return { data };
  }
}
