import {Bindings, IActorQueryOperationOutput} from "@comunica/bus-query-operation";
import {ActorSparqlSerializeFixedMediaTypes, IActionSparqlSerialize,
  IActorSparqlSerializeFixedMediaTypesArgs, IActorSparqlSerializeOutput} from "@comunica/bus-sparql-serialize";
import {IActorTest} from "@comunica/core";
import * as RDF from "rdf-js";
import {Readable} from "stream";

/**
 * A comunica sparql-results+xml Serialize Actor.
 */
export class ActorSparqlSerializeSparqlJson extends ActorSparqlSerializeFixedMediaTypes {

  constructor(args: IActorSparqlSerializeFixedMediaTypesArgs) {
    super(args);
  }

  /**
   * Converts an RDF term to its JSON representation.
   * @param {RDF.Term} value An RDF term.
   * @return {any} A JSON object.
   */
  public static bindingToJsonBindings(value: RDF.Term): any {
    if (value.termType === 'Literal') {
      const literal: RDF.Literal = <RDF.Literal> value;
      const jsonValue: any = { value: literal.value, type: 'literal' };
      const language: string = literal.language;
      const datatype: RDF.NamedNode = literal.datatype;
      if (language) {
        jsonValue['xml:lang'] = language;
      } else if (datatype && datatype.value !== 'http://www.w3.org/2001/XMLSchema#string') {
        jsonValue.datatype = datatype.value;
      }
      return jsonValue;
    } else if (value.termType === 'BlankNode') {
      return { value: value.value, type: 'bnode' };
    } else {
      return { value: value.value, type: 'uri' };
    }
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
    const head: any = {};
    if (action.variables.length) {
      head.vars = action.variables.map((v: string) => v.substr(1));
    }
    data.push('{"head": ' + JSON.stringify(head) + ',\n');
    let empty: boolean = true;

    const resultStream: NodeJS.EventEmitter = action.bindingsStream;

    // Write bindings
    resultStream.on('data', (bindings: Bindings) => {
      if (empty) {
        data.push('"results": { "bindings": [\n');
      } else {
        data.push(',\n');
      }

      // JSON SPARQL results spec does not allow unbound variables and blank node bindings
      const realBindings: Bindings = <any> bindings.filter((v: RDF.Term, k: string) => !!v && k.startsWith('?'));

      data.push(JSON.stringify((<any> realBindings.mapEntries(([key, value]: [string, RDF.Term]) =>
        [key.substr(1), ActorSparqlSerializeSparqlJson.bindingToJsonBindings(value)]))
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

    return { data };
  }

}
