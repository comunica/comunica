import { Readable } from 'stream';
import type { IActionSparqlSerialize, IActorSparqlSerializeFixedMediaTypesArgs,
  IActorSparqlSerializeOutput } from '@comunica/bus-sparql-serialize';
import {
  ActorSparqlSerializeFixedMediaTypes,
} from '@comunica/bus-sparql-serialize';
import type { ActionContext } from '@comunica/core';
import type { Bindings, IActorQueryOperationOutputBindings } from '@comunica/types';
import type * as RDF from 'rdf-js';
import { termToString } from 'rdf-string-ttl';

/**
 * A comunica SPARQL TSV SPARQL Serialize Actor.
 */
export class ActorSparqlSerializeSparqlTsv extends ActorSparqlSerializeFixedMediaTypes {
  public constructor(args: IActorSparqlSerializeFixedMediaTypesArgs) {
    super(args);
  }

  /**
   * Converts an RDF term to its TSV representation.
   * @param {RDF.Term} value An RDF term.
   * @return {string} A string representation of the given value.
   */
  public static bindingToTsvBindings(value?: RDF.Term): string {
    if (!value) {
      return '';
    }

    // Escape tab, newline and carriage return characters
    return termToString(value)
      .replace(/\t/gu, '\\t')
      .replace(/\n/gu, '\\n')
      .replace(/\r/gu, '\\r');
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
    data.push(`${bindingsAction.variables.map((variable: string) => variable.slice(1)).join('\t')}\n`);

    // Write bindings
    bindingsAction.bindingsStream.on('error', (error: Error) => {
      data.emit('error', error);
    });
    bindingsAction.bindingsStream.on('data', (bindings: Bindings) => {
      data.push(`${bindingsAction.variables
        .map((key: string) => ActorSparqlSerializeSparqlTsv
          .bindingToTsvBindings(bindings.get(key)))
        .join('\t')}\n`);
    });
    bindingsAction.bindingsStream.on('end', () => {
      data.push(null);
    });

    return { data };
  }
}
