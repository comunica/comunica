import {IActorQueryOperationOutputQuads} from "@comunica/bus-query-operation";
import {ActorSparqlSerializeFixedMediaTypes, IActionSparqlSerialize,
  IActorSparqlSerializeFixedMediaTypesArgs, IActorSparqlSerializeOutput} from "@comunica/bus-sparql-serialize";
import * as RDF from "rdf-js";
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

  public async testHandleChecked(action: IActionSparqlSerialize) {
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

  public async runHandle(action: IActionSparqlSerialize, mediaType: string): Promise<IActorSparqlSerializeOutput> {
    const data = new Readable();
    data._read = () => {
      return;
    };

    let resultStream: NodeJS.EventEmitter;
    if (action.type === 'bindings') {
      resultStream = action.bindingsStream;
      this.pushHeader(data, action.variables);
      resultStream.on('data', (bindings) => data.push(bindings.map(
        (value: RDF.Term, key: string) => this.pad(value ? value.value : '')).join(' ') + '\n'));
    } else {
      resultStream = (<IActorQueryOperationOutputQuads> action).quadStream;
      this.pushHeader(data, ['subject', 'predicate', 'object', 'graph']);
      resultStream.on('data', (quad) => data.push(
        this.pad(quad.subject.value) + ' '
        + this.pad(quad.predicate.value) + ' '
        + this.pad(quad.object.value) + ' '
        + this.pad(quad.graph.value) + '\n'));
    }
    resultStream.on('end', () => data.push(null));

    return { data };
  }

}

export interface IActorSparqlSerializeTableArgs extends IActorSparqlSerializeFixedMediaTypesArgs {
  columnWidth: number;
}
