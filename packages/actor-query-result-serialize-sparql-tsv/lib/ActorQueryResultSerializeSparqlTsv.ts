import type {
  IActionSparqlSerialize,
  IActorQueryResultSerializeFixedMediaTypesArgs,
  IActorQueryResultSerializeOutput,
} from '@comunica/bus-query-result-serialize';
import {
  ActorQueryResultSerializeFixedMediaTypes,
} from '@comunica/bus-query-result-serialize';
import type { TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
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

  public override async testHandleChecked(
    action: IActionSparqlSerialize,
    _context: IActionContext,
  ): Promise<TestResult<boolean>> {
    if (action.type !== 'bindings') {
      return failTest('This actor can only handle bindings streams.');
    }
    return passTestVoid();
  }

  public async runHandle(action: IActionSparqlSerialize, _mediaType: string | undefined, _context: IActionContext):
  Promise<IActorQueryResultSerializeOutput> {
    const bindingsAction = <IQueryOperationResultBindings> action;

    const data = new Readable();
    // Write head
    const metadata = await bindingsAction.metadata();
    data.push(`${metadata.variables.map(variable => variable.variable.value).join('\t')}\n`);

    // Write Bindings
    data.wrap(<any> bindingsAction.bindingsStream.map((bindings: RDF.Bindings) => `${metadata.variables
      .map(key => ActorQueryResultSerializeSparqlTsv
        .bindingToTsvBindings(bindings.get(key.variable)))
      .join('\t')}\n`));

    return { data };
  }
}
