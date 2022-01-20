import { Readable } from 'stream';
import type { IActionSparqlSerialize,
  IActorQueryResultSerializeFixedMediaTypesArgs,
  IActorQueryResultSerializeOutput } from '@comunica/bus-query-result-serialize';
import { ActorQueryResultSerializeFixedMediaTypes } from '@comunica/bus-query-result-serialize';
import type {
  IActionContext, IQueryableResultBindings,
  IQueryableResultQuads,
} from '@comunica/types';
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

  public pushStat(data: Readable, startTime: [number, number], result: number): void {
    const row: string = [ result, this.delay(startTime), this.httpObserver.requests,
    ].join(',');
    data.push(`${row}\n`);
  }

  public pushFooter(data: Readable, startTime: [number, number]): void {
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
      (<IQueryableResultBindings> action).bindingsStream :
      (<IQueryableResultQuads> action).quadStream;

    const startTime = process.hrtime();
    let result = 1;

    this.pushHeader(data);
    resultStream.on('error', error => data.emit('error', error));
    resultStream.on('data', () => this.pushStat(data, startTime, result++));
    resultStream.on('end', () => this.pushFooter(data, startTime));

    return { data };
  }

  public delay(startTime: [number, number]): number {
    const time: [number, number] = process.hrtime(startTime);
    return time[0] * 1_000 + (time[1] / 1_000_000);
  }
}

export interface IActorQueryResultSerializeStatsArgs extends IActorQueryResultSerializeFixedMediaTypesArgs {
  httpObserver: ActionObserverHttp;
}
