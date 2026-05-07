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
  IActionContext,
  IQueryOperationResultBindings,
  IQueryOperationResultQuads,
} from '@comunica/types';
import { wrap } from 'asynciterator';
import { Readable } from 'readable-stream';
import type { ActionObserverHttp } from './ActionObserverHttp';

/**
 * Serializes SPARQL results for testing and debugging.
 */
export class ActorQueryResultSerializeStats extends ActorQueryResultSerializeFixedMediaTypes {
  public readonly httpObserver: ActionObserverHttp;

  /* eslint-disable max-len */
  /**
   * @param args -
   *   \ @defaultNested {{ "stats": 0.5 }} mediaTypePriorities
   *   \ @defaultNested {{ "stats": "https://comunica.linkeddatafragments.org/#results_stats" }} mediaTypeFormats
   *   \ @defaultNested {<default_observer> a <caqrsst:components/ActionObserverHttp.jsonld#ActionObserverHttp>} httpObserver
   */
  public constructor(args: IActorQueryResultSerializeStatsArgs) {
    super(args);
    this.httpObserver = args.httpObserver;
  }
  /* eslint-enable max-len */

  /**
   * Checks whether the given action can be handled, accepting only bindings or quad stream types.
   * @param action The serialization action to test.
   * @param _context The action context.
   * @return A passing test result, or a failure if the action type is unsupported.
   */
  public override async testHandleChecked(
    action: IActionSparqlSerialize,
    _context: IActionContext,
  ): Promise<TestResult<boolean>> {
    if (![ 'bindings', 'quads' ].includes(action.type)) {
      return failTest('This actor can only handle bindings streams or quad streams.');
    }
    return passTestVoid();
  }

  /**
   * Pushes the CSV header row onto the given readable stream.
   * @param data The readable stream to push the header into.
   */
  public pushHeader(data: Readable): void {
    const header: string = [ 'Result', 'Delay (ms)', 'HTTP requests',
    ].join(',');
    data.push(`${header}\n`);
  }

  /**
   * Creates a CSV-formatted statistics row for a single result entry.
   * @param startTime The high-resolution timestamp marking the start of query execution.
   * @param result The 1-based result index.
   * @return A CSV row string containing the result index, elapsed time, and HTTP request count.
   */
  public createStat(startTime: number, result: number): string {
    const row: string = [ result, this.delay(startTime), this.httpObserver.requests,
    ].join(',');
    return `${row}\n`;
  }

  /**
   * Creates a CSV-formatted row with a special label instead of a result index.
   * @param label The label to use in the result column (e.g., `'PLANNING'` or `'TOTAL'`).
   * @param startTime The high-resolution timestamp marking the start of query execution.
   * @return A CSV row string containing the label, elapsed time, and HTTP request count.
   */
  public createSpecialLine(label: string, startTime: number): string {
    const line: string = [ label, this.delay(startTime), this.httpObserver.requests,
    ].join(',');
    return `${line}\n`;
  }

  /**
   * Handles the serialization by streaming query results as CSV-formatted statistics.
   * @param action The serialization action containing the bindings or quad stream.
   * @param _mediaType The requested media type.
   * @param _context The action context.
   * @return The serialization output containing a readable data stream.
   */
  public async runHandle(action: IActionSparqlSerialize, _mediaType: string, _context: IActionContext):
  Promise<IActorQueryResultSerializeOutput> {
    const data = new Readable();

    const resultStream = action.type === 'bindings' ?
        (<IQueryOperationResultBindings> action).bindingsStream :
        (<IQueryOperationResultQuads> action).quadStream;

    const startTime: number = action.context.getSafe(KeysInitQuery.queryTimestampHighResolution);
    let result = 1;

    function* end(cb: () => string): Generator<string> {
      yield cb();
    }
    const stream = wrap(resultStream)
      .map(() => this.createStat(startTime, result++))
      .prepend([ this.createSpecialLine('PLANNING', startTime) ])
      .append(wrap(end(() => this.createSpecialLine('TOTAL', startTime))));

    this.pushHeader(data);
    data.wrap(<any> stream);

    return { data };
  }

  /**
   * Returns the current high-resolution timestamp in milliseconds.
   * @return The current time from `performance.now()`.
   */
  public now(): number {
    return performance.now();
  }

  /**
   * Calculates the elapsed time in milliseconds since a given start time.
   * @param startTime The high-resolution start timestamp.
   * @return The elapsed time in milliseconds.
   */
  public delay(startTime: number): number {
    return this.now() - startTime;
  }
}

/**
 * Configuration arguments for {@link ActorQueryResultSerializeStats}.
 */
export interface IActorQueryResultSerializeStatsArgs extends IActorQueryResultSerializeFixedMediaTypesArgs {
  /** The HTTP action observer used to track the number of HTTP requests. */
  httpObserver: ActionObserverHttp;
}
