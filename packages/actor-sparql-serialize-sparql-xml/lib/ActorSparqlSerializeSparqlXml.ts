import {Bindings, IActorQueryOperationOutput} from "@comunica/bus-query-operation";
import {ActorSparqlSerializeFixedMediaTypes, IActionSparqlSerialize,
  IActorSparqlSerializeFixedMediaTypesArgs, IActorSparqlSerializeOutput} from "@comunica/bus-sparql-serialize";
import {IActorTest} from "@comunica/core";
import * as RDF from "rdf-js";
import {Readable} from "stream";
import * as xml from "xml";

/**
 * A comunica sparql-results+xml Serialize Actor.
 */
export class ActorSparqlSerializeSparqlXml extends ActorSparqlSerializeFixedMediaTypes {

  constructor(args: IActorSparqlSerializeFixedMediaTypesArgs) {
    super(args);
  }

  /**
   * Converts an RDF term to its object-based XML representation.
   * @param {RDF.Term} value An RDF term.
   * @param {string} key A variable name, '?' must be included as a prefix.
   * @return {any} An object-based XML tag.
   */
  public static bindingToXmlBindings(value: RDF.Term, key: string): any {
    let xmlValue: any;
    if (value.termType === 'Literal') {
      const literal: RDF.Literal = <RDF.Literal> value;
      xmlValue = { literal: literal.value };
      const language: string = literal.language;
      const datatype: RDF.NamedNode = literal.datatype;
      if (language) {
        xmlValue.literal = [{ _attr: { 'xml:lang': language } }, xmlValue.literal];
      } else if (datatype && datatype.value !== 'http://www.w3.org/2001/XMLSchema#string') {
        xmlValue.literal = [{ _attr: { datatype: datatype.value } }, xmlValue.literal];
      }
    } else if (value.termType === 'BlankNode') {
      xmlValue = { bnode: value.value };
    } else {
      xmlValue = { uri: value.value };
    }
    return { binding: [{ _attr: { name: key.substring(1) } }, xmlValue] };
  }

  public async testHandle(action: IActorQueryOperationOutput, mediaType: string): Promise<IActorTest> {
    // Check if we are provided with a bindings stream
    if (!action.bindingsStream) {
      throw new Error('Actor ' + this.name + ' can only handle bindings streams');
    }
    return super.testHandle(action, mediaType);
  }

  public async runHandle(action: IActionSparqlSerialize, mediaType: string): Promise<IActorSparqlSerializeOutput> {
    const data = new Readable();
    data._read = () => {
      return;
    };

    // Write head
    const root = xml.element({ _attr: { xlmns: 'http://www.w3.org/2005/sparql-results#' } });
    const results = xml.element({});
    (<NodeJS.ReadableStream> <any> xml({ sparql: root }, { stream: true, indent: '  ', declaration: true }))
      .on('data', (chunk) => data.push(chunk + '\n'));
    if (action.variables.length) {
      root.push({ head: action.variables.map((v) => ({ variable: { _attr: { name: v.substr(1) } } }))});
    }
    root.push({ results });
    const resultStream: NodeJS.EventEmitter = action.bindingsStream;

    // Write bindings
    resultStream.on('data', (bindings: Bindings) => {
      // XML SPARQL results spec does not allow unbound variables and blank node bindings
      const realBindings = bindings.filter((v: RDF.Term, k: string) => !!v && k.startsWith('?'));
      results.push({ result: realBindings.map(ActorSparqlSerializeSparqlXml.bindingToXmlBindings) });
    });

    // Close streams
    resultStream.on('end', () => {
      results.close();
      root.close();
      data.push(null);
    });

    return { data };
  }

}
