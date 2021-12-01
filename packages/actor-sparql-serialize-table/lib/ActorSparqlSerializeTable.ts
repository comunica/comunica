import { Readable } from 'stream';
import type { IActionSparqlSerialize,
  IActorSparqlSerializeFixedMediaTypesArgs, IActorSparqlSerializeOutput } from '@comunica/bus-sparql-serialize';
import { ActorSparqlSerializeFixedMediaTypes } from '@comunica/bus-sparql-serialize';
import type { ActionContext } from '@comunica/core';
import type {
  Bindings,
  IQueryableResultBindings,
  IQueryableResultQuads,
} from '@comunica/types';

import { getTerms, QUAD_TERM_NAMES } from 'rdf-terms';

/**
 * A comunica Table Sparql Serialize Actor.
 */
export class ActorSparqlSerializeTable extends ActorSparqlSerializeFixedMediaTypes
  implements IActorSparqlSerializeTableArgs {
  public readonly columnWidth: number;
  public readonly padding: string;

  /**
   * @param args -
   *   \ @defaultNested {{ "table": 0.6 }} mediaTypePriorities
   *   \ @defaultNested {{ "table": "https://comunica.linkeddatafragments.org/#results_table" }} mediaTypeFormats
   */
  public constructor(args: IActorSparqlSerializeTableArgs) {
    super(args);
    this.padding = ActorSparqlSerializeTable.repeat(' ', this.columnWidth);
  }

  public static repeat(str: string, count: number): string {
    return new Array(count + 1).join(str);
  }

  public async testHandleChecked(action: IActionSparqlSerialize, context: ActionContext): Promise<boolean> {
    if (![ 'bindings', 'quads' ].includes(action.type)) {
      throw new Error('This actor can only handle bindings or quad streams.');
    }
    return true;
  }

  public pad(str: string): string {
    if (str.length <= this.columnWidth) {
      return str + this.padding.slice(str.length);
    }
    return `${str.slice(0, this.columnWidth - 1)}…`;
  }

  public pushHeader(data: Readable, labels: string[]): void {
    const header: string = labels.map(label => this.pad(label)).join(' ');
    data.push(`${header}\n${ActorSparqlSerializeTable.repeat('-', header.length)}\n`);
  }

  public pushRow(data: Readable, labels: string[], bindings: Bindings): void {
    data.push(`${labels
      .map(label => bindings.has(label) ? bindings.get(label).value : '')
      .map(label => this.pad(label))
      .join(' ')}\n`);
  }

  public async runHandle(action: IActionSparqlSerialize, mediaType: string, context: ActionContext):
  Promise<IActorSparqlSerializeOutput> {
    const data = new Readable();
    data._read = () => {
      // Do nothing
    };

    let resultStream: NodeJS.EventEmitter;
    if (action.type === 'bindings') {
      resultStream = (<IQueryableResultBindings> action).bindingsStream;
      const labels = (<IQueryableResultBindings> action).variables;
      this.pushHeader(data, labels);
      resultStream.on('error', error => data.emit('error', error));
      resultStream.on('data', bindings => this.pushRow(data, labels, bindings));
    } else {
      resultStream = (<IQueryableResultQuads> action).quadStream;
      this.pushHeader(data, QUAD_TERM_NAMES);
      resultStream.on('error', error => data.emit('error', error));
      resultStream.on('data', quad => data.push(
        `${getTerms(quad).map(term => this.pad(term.value)).join(' ')}\n`,
      ));
    }
    resultStream.on('end', () => data.push(null));

    return { data };
  }
}

export interface IActorSparqlSerializeTableArgs extends IActorSparqlSerializeFixedMediaTypesArgs {
  /**
   * The table column width in number of characters
   * @range {integer}
   * @default {50}
   */
  columnWidth: number;
}
