import type { IActionSparqlSerialize,
  IActorQueryResultSerializeFixedMediaTypesArgs,
  IActorQueryResultSerializeOutput } from '@comunica/bus-query-result-serialize';
import { ActorQueryResultSerializeFixedMediaTypes } from '@comunica/bus-query-result-serialize';
import type {
  Bindings, IActionContext,
  IQueryOperationResultBindings,
  IQueryOperationResultQuads,
} from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { termToString } from 'rdf-string';
import { getTerms, QUAD_TERM_NAMES } from 'rdf-terms';
import { Readable } from 'readable-stream';

const DF = new DataFactory();
const QUAD_TERM_NAMES_VARS = QUAD_TERM_NAMES.map(name => DF.variable(name));

/**
 * A comunica Table Sparql Serialize Actor.
 */
export class ActorQueryResultSerializeTable extends ActorQueryResultSerializeFixedMediaTypes
  implements IActorQueryResultSerializeTableArgs {
  public readonly columnWidth: number;
  public readonly padding: string;

  /**
   * @param args -
   *   \ @defaultNested {{ "table": 0.6 }} mediaTypePriorities
   *   \ @defaultNested {{ "table": "https://comunica.linkeddatafragments.org/#results_table" }} mediaTypeFormats
   */
  public constructor(args: IActorQueryResultSerializeTableArgs) {
    super(args);
    this.padding = ActorQueryResultSerializeTable.repeat(' ', this.columnWidth);
  }

  public static repeat(str: string, count: number): string {
    return str.repeat(count);
  }

  public async testHandleChecked(action: IActionSparqlSerialize, context: IActionContext): Promise<boolean> {
    if (![ 'bindings', 'quads' ].includes(action.type)) {
      throw new Error('This actor can only handle bindings or quad streams.');
    }
    return true;
  }

  public termToString(term: RDF.Term): string {
    return term.termType === 'Quad' ? termToString(term) : term.value;
  }

  public pad(str: string): string {
    if (str.length <= this.columnWidth) {
      return str + this.padding.slice(str.length);
    }
    return `${str.slice(0, this.columnWidth - 1)}…`;
  }

  public pushHeader(data: Readable, labels: RDF.Variable[]): void {
    const header: string = labels.map(label => this.pad(label.value)).join(' ');
    data.push(`${header}\n${ActorQueryResultSerializeTable.repeat('-', header.length)}\n`);
  }

  public pushRow(data: Readable, labels: RDF.Variable[], bindings: Bindings): void {
    data.push(`${labels
      .map(label => bindings.has(label) ? this.termToString(bindings.get(label)!) : '')
      .map(label => this.pad(label))
      .join(' ')}\n`);
  }

  public async runHandle(action: IActionSparqlSerialize, mediaType: string, context: IActionContext):
  Promise<IActorQueryResultSerializeOutput> {
    const data = new Readable();
    data._read = () => {
      // Do nothing
    };

    let resultStream: NodeJS.EventEmitter;
    if (action.type === 'bindings') {
      resultStream = (<IQueryOperationResultBindings> action).bindingsStream;
      const labels = (await (<IQueryOperationResultBindings> action).metadata()).variables;
      this.pushHeader(data, labels);
      resultStream.on('error', error => data.emit('error', error));
      resultStream.on('data', bindings => this.pushRow(data, labels, bindings));
    } else {
      resultStream = (<IQueryOperationResultQuads> action).quadStream;
      this.pushHeader(data, QUAD_TERM_NAMES_VARS);
      resultStream.on('error', error => data.emit('error', error));
      resultStream.on('data', quad => data.push(
        `${getTerms(quad).map(term => this.pad(this.termToString(term))).join(' ')}\n`,
      ));
    }
    resultStream.on('end', () => data.push(null));

    return { data };
  }
}

export interface IActorQueryResultSerializeTableArgs extends IActorQueryResultSerializeFixedMediaTypesArgs {
  /**
   * The table column width in number of characters
   * @range {integer}
   * @default {50}
   */
  columnWidth: number;
}
