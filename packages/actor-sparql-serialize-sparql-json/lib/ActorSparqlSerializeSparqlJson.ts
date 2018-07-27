import {Bindings, IActorQueryOperationOutputBindings,
  IActorQueryOperationOutputBoolean} from "@comunica/bus-query-operation";
import {ActorSparqlSerializeFixedMediaTypes, IActionSparqlSerialize,
  IActorSparqlSerializeFixedMediaTypesArgs, IActorSparqlSerializeOutput} from "@comunica/bus-sparql-serialize";
import {ActionContext} from "@comunica/core";
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

  public async testHandleChecked(action: IActionSparqlSerialize, context: ActionContext) {
    if (['bindings', 'boolean'].indexOf(action.type) < 0) {
      throw new Error('This actor can only handle bindings streams or booleans.');
    }
    return true;
  }

  public async runHandle(action: IActionSparqlSerialize, mediaType: string, context: ActionContext)
    : Promise<IActorSparqlSerializeOutput> {
    const data = new Readable();
    data._read = () => {
      return;
    };

    // Write head
    const head: any = {};
    if (action.type === 'bindings' && (<IActorQueryOperationOutputBindings> action).variables.length) {
      head.vars = (<IActorQueryOperationOutputBindings> action).variables.map((v: string) => v.substr(1));
    }
    data.push('{"head": ' + JSON.stringify(head) + ',\n');
    let empty: boolean = true;

    if (action.type === 'bindings') {
      const resultStream: NodeJS.EventEmitter = (<IActorQueryOperationOutputBindings> action).bindingsStream;

      // Write bindings
      resultStream.on('error', (e: Error) => {
        data.emit('error', e);
      });
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
    } else {
      try {
        data.push('"boolean":' + await (<IActorQueryOperationOutputBoolean> action).booleanResult + '\n}\n');
        data.push(null);
      } catch (e) {
        setImmediate(() => data.emit('error', e));
      }
    }

    return { data };
  }

}
