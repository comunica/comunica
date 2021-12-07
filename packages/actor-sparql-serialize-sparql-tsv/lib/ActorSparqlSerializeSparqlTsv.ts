import { Readable } from 'stream';
import type { IActionSparqlSerialize, IActorSparqlSerializeFixedMediaTypesArgs,
  IActorSparqlSerializeOutput } from '@comunica/bus-sparql-serialize';
import {
  ActorSparqlSerializeFixedMediaTypes,
} from '@comunica/bus-sparql-serialize';
import type { Bindings, IActionContext, IQueryableResultBindings } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { termToString } from 'rdf-string-ttl';

/**
 * A comunica SPARQL TSV SPARQL Serialize Actor.
 */
export class ActorSparqlSerializeSparqlTsv extends ActorSparqlSerializeFixedMediaTypes {
  /**
   * @param args -
   *   \ @defaultNested {{
   *       "text/tab-separated-values": 0.75
   *     }} mediaTypePriorities
   *   \ @defaultNested {{
   *       "text/tab-separated-values": "http://www.w3.org/ns/formats/SPARQL_Results_TSV"
   *     }} mediaTypeFormats
   */
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

  public async testHandleChecked(action: IActionSparqlSerialize, context: IActionContext): Promise<boolean> {
    if (action.type !== 'bindings') {
      throw new Error('This actor can only handle bindings streams.');
    }
    return true;
  }

  public async runHandle(action: IActionSparqlSerialize, mediaType: string | undefined, context: IActionContext):
  Promise<IActorSparqlSerializeOutput> {
    const bindingsAction = <IQueryableResultBindings> action;

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
