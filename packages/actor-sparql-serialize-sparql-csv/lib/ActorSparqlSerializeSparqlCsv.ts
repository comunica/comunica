import { Readable } from 'stream';
import type { IActionSparqlSerialize, IActorSparqlSerializeFixedMediaTypesArgs,
  IActorSparqlSerializeOutput } from '@comunica/bus-sparql-serialize';
import {
  ActorSparqlSerializeFixedMediaTypes,
} from '@comunica/bus-sparql-serialize';
import type { ActionContext } from '@comunica/core';
import type { Bindings, IActorQueryOperationOutputBindings } from '@comunica/types';
import type * as RDF from 'rdf-js';

/**
 * A comunica SPARQL CSV SPARQL Serialize Actor.
 */
export class ActorSparqlSerializeSparqlCsv extends ActorSparqlSerializeFixedMediaTypes {
  public constructor(args: IActorSparqlSerializeFixedMediaTypesArgs) {
    super(args);
  }

  /**
   * Converts an RDF term to its CSV representation.
   * @param {RDF.Term} value An RDF term.
   * @return {string} A string representation of the given value.
   */
  public static bindingToCsvBindings(value?: RDF.Term): string {
    if (!value) {
      return '';
    }

    let stringValue = value.value;

    if (value.termType === 'Literal') {
      // This is a lossy representation, since language and datatype are not encoded in here.
      stringValue = `${stringValue}`;
    } else if (value.termType === 'BlankNode') {
      stringValue = `_:${stringValue}`;
    } else {
      stringValue = `<${stringValue}>`;
    }

    // If a value contains certain characters, put it between double quotes
    if (/[",\n\r]/u.test(stringValue)) {
      // Within quote strings, " is written using a pair of quotation marks "".
      stringValue = `"${stringValue.replace(/"/gu, '""')}"`;
    }

    return stringValue;
  }

  public async testHandleChecked(action: IActionSparqlSerialize, context: ActionContext): Promise<boolean> {
    if (action.type !== 'bindings') {
      throw new Error('This actor can only handle bindings streams.');
    }
    return true;
  }

  public async runHandle(action: IActionSparqlSerialize, mediaType?: string, context?: ActionContext):
  Promise<IActorSparqlSerializeOutput> {
    const bindingsAction = <IActorQueryOperationOutputBindings> action;

    const data = new Readable();
    data._read = () => {
      // Do nothing
    };

    // Write head
    data.push(`${bindingsAction.variables.map((variable: string) => variable.slice(1)).join(',')}\r\n`);

    // Write bindings
    bindingsAction.bindingsStream.on('error', (error: Error) => {
      data.emit('error', error);
    });
    bindingsAction.bindingsStream.on('data', (bindings: Bindings) => {
      data.push(`${bindingsAction.variables
        .map((key: string) => ActorSparqlSerializeSparqlCsv
          .bindingToCsvBindings(bindings.get(key)))
        .join(',')}\r\n`);
    });
    bindingsAction.bindingsStream.on('end', () => {
      data.push(null);
    });

    return { data };
  }
}
