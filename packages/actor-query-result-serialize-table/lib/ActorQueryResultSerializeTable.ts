import type {
  IActionSparqlSerialize,
  IActorQueryResultSerializeFixedMediaTypesArgs,
  IActorQueryResultSerializeOutput,
} from '@comunica/bus-query-result-serialize';
import { ActorQueryResultSerializeFixedMediaTypes } from '@comunica/bus-query-result-serialize';
import { KeysInitQuery } from '@comunica/context-entries';
import type { TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import type {
  Bindings,
  ComunicaDataFactory,
  IActionContext,
  IQueryOperationResultBindings,
  IQueryOperationResultQuads,
} from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { termToString } from 'rdf-string';
import { getTerms, QUAD_TERM_NAMES } from 'rdf-terms';
import { Readable } from 'readable-stream';

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
    this.columnWidth = args.columnWidth;
    this.padding = ActorQueryResultSerializeTable.repeat(' ', this.columnWidth);
  }

  /**
   * Repeats the given string a specified number of times.
   * @param str The string to repeat.
   * @param count The number of repetitions.
   * @return The repeated string.
   */
  public static repeat(str: string, count: number): string {
    return str.repeat(count);
  }

  /**
   * Tests whether this actor can handle the given serialization action.
   * @param action The serialization action to test.
   * @param _context The action context.
   * @return A test result that passes for bindings or quad streams.
   */
  public override async testHandleChecked(
    action: IActionSparqlSerialize,
    _context: IActionContext,
  ): Promise<TestResult<boolean>> {
    if (![ 'bindings', 'quads' ].includes(action.type)) {
      return failTest('This actor can only handle bindings or quad streams.');
    }
    return passTestVoid();
  }

  /**
   * Converts an RDF term to its string representation.
   * @param term The RDF term to convert.
   * @return The string value of the term.
   */
  public termToString(term: RDF.Term): string {
    return term.termType === 'Quad' ? termToString(term) : term.value;
  }

  /**
   * Pads or truncates a string to fit the configured column width.
   * @param str The string to pad.
   * @return The padded or truncated string.
   */
  public pad(str: string): string {
    if (str.length <= this.columnWidth) {
      return str + this.padding.slice(str.length);
    }
    return `${str.slice(0, this.columnWidth - 1)}…`;
  }

  /**
   * Pushes a formatted header row with column labels to the data stream.
   * @param data The readable stream to push the header to.
   * @param labels The variable labels for the table columns.
   */
  public pushHeader(data: Readable, labels: RDF.Variable[]): void {
    const header: string = labels.map(label => this.pad(label.value)).join(' ');
    data.push(`${header}\n${ActorQueryResultSerializeTable.repeat('-', header.length)}\n`);
  }

  /**
   * Creates a formatted table row string from the given bindings.
   * @param labels The variable labels defining the column order.
   * @param bindings The bindings to render as a row.
   * @return The formatted row string.
   */
  public createRow(labels: RDF.Variable[], bindings: Bindings): string {
    return `${labels
      .map(label => bindings.has(label) ? this.termToString(bindings.get(label)!) : '')
      .map(label => this.pad(label))
      .join(' ')}\n`;
  }

  /**
   * Serializes the query result as a formatted text table.
   * @param action The serialization action containing the result stream.
   * @param _mediaType The requested media type.
   * @param _context The action context.
   * @return The serialization output containing a readable data stream.
   */
  public async runHandle(action: IActionSparqlSerialize, _mediaType: string, _context: IActionContext):
  Promise<IActorQueryResultSerializeOutput> {
    const data = new Readable();

    let resultStream: NodeJS.EventEmitter;
    if (action.type === 'bindings') {
      resultStream = (<IQueryOperationResultBindings>action).bindingsStream.map(
        bindings => this.createRow(labels, bindings),
      );
      const labels = (await (<IQueryOperationResultBindings>action).metadata()).variables.map(v => v.variable);
      this.pushHeader(data, labels);
    } else {
      resultStream = (<IQueryOperationResultQuads>action).quadStream.map(quad => `${getTerms(quad).map(term => this.pad(this.termToString(term))).join(' ')}\n`);
      const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
      this.pushHeader(data, QUAD_TERM_NAMES.map(name => dataFactory.variable(name)));
    }
    data.wrap(<any> resultStream);

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
