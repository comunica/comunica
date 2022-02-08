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
import * as xml from 'xml';

/**
 * A comunica sparql-results+xml Serialize Actor.
 */
export class ActorQueryResultSerializeSparqlXml extends ActorQueryResultSerializeFixedMediaTypes {
  /**
   * @param args -
   *   \ @defaultNested {{
   *       "application/sparql-results+xml": 0.8
   *     }} mediaTypePriorities
   *   \ @defaultNested {{
   *       "application/sparql-results+xml": "http://www.w3.org/ns/formats/SPARQL_Results_XML"
   *     }} mediaTypeFormats
   */
  public constructor(args: IActorQueryResultSerializeFixedMediaTypesArgs) {
    super(args);
  }

  /**
   * Converts an RDF term to its object-based XML representation.
   * @param {RDF.Term} value An RDF term.
   * @param {string} key A variable name, '?' must be included as a prefix.
   * @return {any} An object-based XML tag.
   */
  public static bindingToXmlBindings(value: RDF.Term, key: RDF.Variable): any {
    let xmlValue: any;
    if (value.termType === 'Literal') {
      const literal: RDF.Literal = value;
      xmlValue = { literal: literal.value };
      const { language } = literal;
      const { datatype } = literal;
      if (language) {
        xmlValue.literal = [{ _attr: { 'xml:lang': language }}, xmlValue.literal ];
      } else if (datatype && datatype.value !== 'http://www.w3.org/2001/XMLSchema#string') {
        xmlValue.literal = [{ _attr: { datatype: datatype.value }}, xmlValue.literal ];
      }
    } else if (value.termType === 'BlankNode') {
      xmlValue = { bnode: value.value };
    } else {
      xmlValue = { uri: value.value };
    }
    return { binding: [{ _attr: { name: key.value }}, xmlValue ]};
  }

  public async testHandleChecked(action: IActionSparqlSerialize, context: IActionContext): Promise<boolean> {
    if (![ 'bindings', 'boolean' ].includes(action.type)) {
      throw new Error('This actor can only handle bindings streams or booleans.');
    }
    return true;
  }

  public async runHandle(action: IActionSparqlSerialize, mediaType: string, context: IActionContext):
  Promise<IActorQueryResultSerializeOutput> {
    const data = new Readable();
    data._read = () => {
      // Do nothing
    };

    // Write head
    const root = xml.element({ _attr: { xlmns: 'http://www.w3.org/2005/sparql-results#' }});
    (<NodeJS.ReadableStream> <any> xml({ sparql: root }, { stream: true, indent: '  ', declaration: true }))
      .on('data', chunk => data.push(`${chunk}\n`));
    if (action.type === 'bindings') {
      const metadata = await (<IQueryOperationResultBindings> action).metadata();
      if (metadata.variables.length > 0) {
        root.push({ head: metadata.variables.map(variable => ({ variable: { _attr: { name: variable.value }}})) });
      }
    }

    if (action.type === 'bindings') {
      const results = xml.element({});
      root.push({ results });
      const resultStream: NodeJS.EventEmitter = (<IQueryOperationResultBindings> action).bindingsStream;

      // Write bindings
      resultStream.on('error', (error: Error) => {
        data.emit('error', error);
      });
      resultStream.on('data', (bindings: Bindings) => {
        // XML SPARQL results spec does not allow unbound variables and blank node bindings
        results.push({ result: [ ...bindings ]
          .map(([ key, value ]) => ActorQueryResultSerializeSparqlXml.bindingToXmlBindings(value, key)) });
      });

      // Close streams
      resultStream.on('end', () => {
        results.close();
        root.close();
        setImmediate(() => data.push(null));
      });
    } else {
      try {
        root.push({ boolean: await (<IQueryOperationResultBoolean> action).booleanResult });
        root.close();
        setImmediate(() => data.push(null));
      } catch (error: unknown) {
        setImmediate(() => data.emit('error', error));
      }
    }

    return { data };
  }
}
