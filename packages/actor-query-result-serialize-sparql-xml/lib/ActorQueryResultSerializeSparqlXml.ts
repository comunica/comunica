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
import { wrap } from 'asynciterator';
import { Readable } from 'readable-stream';
import { XmlSerializer, type IXmlNode } from './XmlSerializer';

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
   * @return {IXmlNode} An object-based XML tag.
   */
  public static bindingToXmlBindings(value: RDF.Term, key: RDF.Variable): IXmlNode {
    return { name: 'binding', attributes: { name: key.value }, children: [ this.valueToXmlValue(value) ]};
  }

  public static valueToXmlValue(value: RDF.Term): IXmlNode {
    let attributes;
    switch (value.termType) {
      case 'Literal':
        if (value.language) {
          attributes = { 'xml:lang': value.language };
        } else if (value.datatype && value.datatype.value !== 'http://www.w3.org/2001/XMLSchema#string') {
          attributes = { datatype: value.datatype.value };
        } else {
          attributes = {};
        }
        return { name: 'literal', attributes, children: value.value };
      case 'BlankNode':
        return { name: 'bnode', children: value.value };
      case 'Quad':
        return {
          name: 'triple',
          children: [
            { name: 'subject', children: [ this.valueToXmlValue(value.subject) ]},
            { name: 'predicate', children: [ this.valueToXmlValue(value.predicate) ]},
            { name: 'object', children: [ this.valueToXmlValue(value.object) ]},
          ],
        };
      default:
        return { name: 'uri', children: value.value };
    }
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

  public async runHandle(action: IActionSparqlSerialize, _mediaType: string, _context: IActionContext):
  Promise<IActorQueryResultSerializeOutput> {
    const data = new Readable();
    data._read = () => {
      // Do nothing
    };

    const serializer = new XmlSerializer();
    const metadata = await (<IQueryOperationResultBindings> action).metadata();

    data.push(XmlSerializer.header);
    data.push(serializer.open('sparql', { xmlns: 'http://www.w3.org/2005/sparql-results#' }));
    data.push(
      serializer.serializeNode({
        name: 'head',
        children: metadata.variables
          .map(variable => ({ name: 'variable', attributes: { name: variable.variable.value }})),
      }),
    );

    if (action.type === 'bindings') {
      function* end(): Generator<string, void> {
        yield serializer.close();
        yield serializer.close();
      }
      data.push(serializer.open('results'));
      const stream = wrap((<IQueryOperationResultBindings> action).bindingsStream).map(
        (bindings: RDF.Bindings) => serializer.serializeNode({
          name: 'result',
          children: [ ...bindings ].map(
            ([ key, value ]) => ActorQueryResultSerializeSparqlXml.bindingToXmlBindings(value, key),
          ),
        }),
      ).append(wrap(end()));
      data.wrap(<any> stream);
    } else {
      try {
        const result = await (<IQueryOperationResultBoolean> action).execute();
        data.push(serializer.serializeNode({ name: 'boolean', children: result.toString() }));
        data.push(serializer.close());
        setTimeout(() => data.push(null));
      } catch (error: unknown) {
        setTimeout(() => data.emit('error', error));
      }
    }

    return { data };
  }
}
