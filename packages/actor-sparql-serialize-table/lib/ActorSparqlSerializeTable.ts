import {
  Bindings,
  IActorQueryOperationOutputBindings,
  IActorQueryOperationOutputQuads
} from "@comunica/bus-query-operation";
import {ActorSparqlSerializeFixedMediaTypes, IActionSparqlSerialize,
  IActorSparqlSerializeFixedMediaTypesArgs, IActorSparqlSerializeOutput} from "@comunica/bus-sparql-serialize";
import {ActionContext} from "@comunica/core";
import * as RDF from "rdf-js";
import {getTerms, QUAD_TERM_NAMES} from "rdf-terms";
import {Readable} from "stream";

/**
 * A comunica Table Sparql Serialize Actor.
 */
export class ActorSparqlSerializeTable extends ActorSparqlSerializeFixedMediaTypes
  implements IActorSparqlSerializeTableArgs {

  public readonly columnWidth: number;
  public readonly padding: string;

  constructor(args: IActorSparqlSerializeTableArgs) {
    super(args);
    this.padding = ActorSparqlSerializeTable.repeat(' ', this.columnWidth);
  }

  public static repeat(str: string, count: number): string {
    return new Array(count + 1).join(str);
  }

  public async testHandleChecked(action: IActionSparqlSerialize, context: ActionContext) {
    if (['bindings', 'quads'].indexOf(action.type) < 0) {
      throw new Error('This actor can only handle bindings or quad streams.');
    }
    return true;
  }

  public pad(str: string): string {
    if (str.length <= this.columnWidth) {
      return str + this.padding.slice(str.length);
    } else {
      return str.slice(0, this.columnWidth - 1) + '…';
    }
  }

  public pushHeader(data: Readable, labels: string[]) {
    const header: string = labels.map(this.pad, this).join(' ');
    data.push(header + '\n' + ActorSparqlSerializeTable.repeat('-', header.length) + '\n');
  }

  public pushRow(data: Readable, labels: string[], bindings: Bindings) {
    data.push(labels
      .map((label) => bindings.has(label) ? bindings.get(label).value : '')
      .map(this.pad, this)
      .join(' ') + '\n');
  }

  public async runHandle(action: IActionSparqlSerialize, mediaType: string, context: ActionContext)
    : Promise<IActorSparqlSerializeOutput> {
    const data = new Readable();
    data._read = () => {
      return;
    };

    let resultStream: NodeJS.EventEmitter;
    if (action.type === 'bindings') {
      resultStream = (<IActorQueryOperationOutputBindings> action).bindingsStream;
      const labels = (<IActorQueryOperationOutputBindings> action).variables;
      this.pushHeader(data, labels);
      resultStream.on('error', (e) => data.emit('error', e));
      resultStream.on('data', (bindings) => this.pushRow(data, labels, bindings));
    } else {
      resultStream = (<IActorQueryOperationOutputQuads> action).quadStream;
      this.pushHeader(data, QUAD_TERM_NAMES);
      resultStream.on('error', (e) => data.emit('error', e));
      resultStream.on('data', (quad) => data.push(
        getTerms(quad).map((term) => this.pad(term.value)).join(' ') + '\n'));
    }
    resultStream.on('end', () => data.push(null));

    return { data };
  }

}

export interface IActorSparqlSerializeTableArgs extends IActorSparqlSerializeFixedMediaTypesArgs {
  columnWidth: number;
}
