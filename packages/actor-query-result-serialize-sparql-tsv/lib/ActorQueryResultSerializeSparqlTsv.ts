import type {
  IActionSparqlSerialize,
  IActorQueryResultSerializeFixedMediaTypesArgs,
  IActorQueryResultSerializeOutput,
} from '@comunica/bus-query-result-serialize';
import {
  ActorQueryResultSerializeFixedMediaTypes,
} from '@comunica/bus-query-result-serialize';
import type { IActionContext, IQueryOperationResultBindings } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { termToString } from 'rdf-string-ttl';
import { Readable } from 'readable-stream';

/**
 * A comunica SPARQL TSV Query Result Serialize Actor.
 */
export class ActorQueryResultSerializeSparqlTsv extends ActorQueryResultSerializeFixedMediaTypes {
  /**
   * @param args -
   *   \ @defaultNested {{
   *       "text/tab-separated-values": 0.75
   *     }} mediaTypePriorities
   *   \ @defaultNested {{
   *       "text/tab-separated-values": "http://www.w3.org/ns/formats/SPARQL_Results_TSV"
   *     }} mediaTypeFormats
   */
  public constructor(args: IActorQueryResultSerializeFixedMediaTypesArgs) {
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
      .replaceAll('\t', '\\t')
      .replaceAll('\n', '\\n')
      .replaceAll('\r', '\\r');
  }

  public override async testHandleChecked(action: IActionSparqlSerialize, _context: IActionContext): Promise<boolean> {
    if (action.type !== 'bindings') {
      throw new Error('This actor can only handle bindings streams.');
    }
    return true;
  }

  public async runHandle(action: IActionSparqlSerialize, _mediaType: string | undefined, _context: IActionContext):
  Promise<IActorQueryResultSerializeOutput> {
    const bindingsAction = <IQueryOperationResultBindings> action;

    const data = new Readable();
    const read = data._read = (size) => {
      while (size > 0) {
        const bindings = bindingsAction.bindingsStream.read();
        if (bindings === null) {
          bindingsAction.bindingsStream.once('readable', () => read(size));
          return;
        }
        size--;
        data.push(`${metadata.variables
          .map((key: RDF.Variable) => ActorQueryResultSerializeSparqlTsv
            .bindingToTsvBindings(bindings.get(key)))
          .join('\t')}\n`);
      }
    };

    // Write head
    const metadata = await bindingsAction.metadata();
    data.push(`${metadata.variables.map((variable: RDF.Variable) => variable.value).join('\t')}\n`);

    // Write bindings
    bindingsAction.bindingsStream.on('error', (error: Error) => {
      data.emit('error', error);
    });
    bindingsAction.bindingsStream.on('end', () => {
      data.push(null);
    });

    return { data };
  }
}
