import type {
  IActionSparqlSerialize,
  IActorQueryResultSerializeFixedMediaTypesArgs,
  IActorQueryResultSerializeOutput,
} from '@comunica/bus-query-result-serialize';
import { ActorQueryResultSerializeFixedMediaTypes } from '@comunica/bus-query-result-serialize';
import { KeysInitQuery } from '@comunica/context-entries';
import type { TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import type { ActionObserverHttpRequests } from '@comunica/observer-http-requests';
import type {
  IActionContext,
  IQueryOperationResultBindings,
  IQueryOperationResultQuads,
} from '@comunica/types';
import { wrap } from 'asynciterator';
import { Readable } from 'readable-stream';

/**
 * Serializes SPARQL results for testing and debugging.
 */
export class ActorQueryResultSerializeStats extends ActorQueryResultSerializeFixedMediaTypes {
  private readonly httpRequestCountObserver: ActionObserverHttpRequests | undefined;

  /**
   * @param args -
   *   \ @defaultNested {{ "stats": 0.5 }} mediaTypePriorities
   *   \ @defaultNested {{ "stats": "https://comunica.linkeddatafragments.org/#results_stats" }} mediaTypeFormats
   */
  public constructor(args: IActorQueryResultSerializeStatsArgs) {
    super(args);
    this.httpRequestCountObserver = args.httpRequestCountObserver;
  }

  public override async testHandleChecked(
    action: IActionSparqlSerialize,
    _context: IActionContext,
  ): Promise<TestResult<boolean>> {
    if (![ 'bindings', 'quads' ].includes(action.type)) {
      return failTest('This actor can only handle bindings streams or quad streams.');
    }
    return passTestVoid();
  }

  public pushHeader(data: Readable): void {
    const header: string = [
      'Result',
      'Delay (ms)',
      ...this.httpRequestCountObserver ? [ 'HTTP requests' ] : [],
    ].join(',');
    data.push(`${header}\n`);
  }

  public createStat(startTime: number, result: number): string {
    const row: string = [
      result,
      this.delay(startTime),
      ...this.httpRequestCountObserver ? [ this.httpRequestCountObserver.requests ] : [],
    ].join(',');
    return `${row}\n`;
  }

  public createSpecialLine(label: string, startTime: number): string {
    const line: string = [
      label,
      this.delay(startTime),
      ...this.httpRequestCountObserver ? [ this.httpRequestCountObserver.requests ] : [],
    ].join(',');
    return `${line}\n`;
  }

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

  public now(): number {
    return performance.now();
  }

  public delay(startTime: number): number {
    return this.now() - startTime;
  }
}

export interface IActorQueryResultSerializeStatsArgs extends IActorQueryResultSerializeFixedMediaTypesArgs {
  /**
   * Optional observer on the HTTP bus that counts the number of HTTP requests done by the engine.
   * This request count will then be reported in the results.
   */
  httpRequestCountObserver?: ActionObserverHttpRequests;
}
