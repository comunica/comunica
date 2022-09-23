import type { IActionSparqlSerialize,
  IActorQueryResultSerializeFixedMediaTypesArgs,
  IActorQueryResultSerializeOutput } from '@comunica/bus-query-result-serialize';
import { ActorQueryResultSerializeFixedMediaTypes } from '@comunica/bus-query-result-serialize';
import type {
  IActionContext, IQueryOperationResultBindings,
  IQueryOperationResultQuads,
} from '@comunica/types';
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
  }
  /* eslint-enable max-len */

  public async testHandleChecked(action: IActionSparqlSerialize, context: IActionContext): Promise<boolean> {
    if (![ 'bindings', 'quads' ].includes(action.type)) {
      throw new Error('This actor can only handle bindings streams or quad streams.');
    }
    return true;
  }

  public pushHeader(data: Readable): void {
    const header: string = [ 'Result', 'Delay (ms)', 'HTTP requests',
    ].join(',');
    data.push(`${header}\n`);
  }

  public pushStat(data: Readable, startTime: number, result: number): void {
    const row: string = [ result, this.delay(startTime), this.httpObserver.requests,
    ].join(',');
    data.push(`${row}\n`);
  }

  public pushFooter(data: Readable, startTime: number): void {
    const footer: string = [ 'TOTAL', this.delay(startTime), this.httpObserver.requests,
    ].join(',');
    data.push(`${footer}\n`);
    data.push(null);
  }

  public async runHandle(action: IActionSparqlSerialize, mediaType: string, context: IActionContext):
  Promise<IActorQueryResultSerializeOutput> {
    const data = new Readable();
    data._read = () => {
      // Do nothing
    };

    const resultStream: NodeJS.EventEmitter = action.type === 'bindings' ?
      (<IQueryOperationResultBindings> action).bindingsStream :
      (<IQueryOperationResultQuads> action).quadStream;

    const startTime = this.now();
    let result = 1;

    this.pushHeader(data);
    resultStream.on('error', error => data.emit('error', error));
    resultStream.on('data', () => this.pushStat(data, startTime, result++));
    resultStream.on('end', () => this.pushFooter(data, startTime));

    return { data };
  }

  /* istanbul ignore next */
  public now(): number {
    // TODO: remove when we will drop support of Node 14
    if (typeof performance === 'undefined') {
      const time: [number, number] = process.hrtime();
      return time[0] * 1_000 + (time[1] / 1_000_000);
    }
    return performance.now();
  }

  public delay(startTime: number): number {
    return this.now() - startTime;
  }
}

export interface IActorQueryResultSerializeStatsArgs extends IActorQueryResultSerializeFixedMediaTypesArgs {
  httpObserver: ActionObserverHttp;
}
