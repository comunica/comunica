import { Readable } from 'stream';
import type { IActionSparqlSerialize,
  IActorSparqlSerializeFixedMediaTypesArgs, IActorSparqlSerializeOutput } from '@comunica/bus-sparql-serialize';
import { ActorSparqlSerializeFixedMediaTypes } from '@comunica/bus-sparql-serialize';
import type { ActionContext } from '@comunica/core';
import type { Bindings, IActorQueryOperationOutputBindings,
  IActorQueryOperationOutputBoolean } from '@comunica/types';
import type * as RDF from 'rdf-js';

/**
 * A comunica sparql-results+xml Serialize Actor.
 */
export class ActorSparqlSerializeSparqlJson extends ActorSparqlSerializeFixedMediaTypes {
  public constructor(args: IActorSparqlSerializeFixedMediaTypesArgs) {
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

  public async testHandleChecked(action: IActionSparqlSerialize, context: ActionContext): Promise<boolean> {
    if (![ 'bindings', 'boolean' ].includes(action.type)) {
      throw new Error('This actor can only handle bindings streams or booleans.');
    }
    return true;
  }

  public async runHandle(action: IActionSparqlSerialize, mediaType?: string, context?: ActionContext):
  Promise<IActorSparqlSerializeOutput> {
    const data = new Readable();
    data._read = () => {
      // Do nothing
    };

    // Write head
    const head: any = {};
    if (action.type === 'bindings' && (<IActorQueryOperationOutputBindings> action).variables.length > 0) {
      head.vars = (<IActorQueryOperationOutputBindings> action).variables.map((variable: string) => variable.slice(1));
    }
    data.push(`{"head": ${JSON.stringify(head)},\n`);
    let empty = true;

    if (action.type === 'bindings') {
      const resultStream: NodeJS.EventEmitter = (<IActorQueryOperationOutputBindings> action).bindingsStream;

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
        const realBindings: Bindings = <any> bindings
          .filter((value: RDF.Term, key: string) => Boolean(value) && key.startsWith('?'));

        data.push(JSON.stringify((<any> realBindings.mapEntries(([ key, value ]: [string, RDF.Term]) =>
          [ key.slice(1), ActorSparqlSerializeSparqlJson.bindingToJsonBindings(value) ]))
          .toJSON()));
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
        data.push(`"boolean":${await (<IActorQueryOperationOutputBoolean> action).booleanResult}\n}\n`);
        data.push(null);
      } catch (error: unknown) {
        data.once('newListener', () => data.emit('error', error));
      }
    }

    return { data };
  }
}
