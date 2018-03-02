import {IActorQueryOperationOutputBindings,
  IActorQueryOperationOutputQuads} from "@comunica/bus-query-operation";
import {ActorSparqlSerializeFixedMediaTypes, IActionSparqlSerialize,
  IActorSparqlSerializeFixedMediaTypesArgs, IActorSparqlSerializeOutput} from "@comunica/bus-sparql-serialize";
import {Readable} from "stream";

/**
 * Serializes SPARQL results for testing and debugging.
 */
export class ActorSparqlSerializeStats extends ActorSparqlSerializeFixedMediaTypes {

  private startTime: [number, number] = process.hrtime();
  private result: number = 1;

  constructor(args: IActorSparqlSerializeStatsArgs) {
    super(args);
    if (args.delay) {
      this.delay = args.delay;
    }
  }

  public async testHandleChecked(action: IActionSparqlSerialize) {
    if (['bindings', 'quads'].indexOf(action.type) < 0) {
      throw new Error('This actor can only handle bindings streams or quad streams.');
    }
    return true;
  }

  public pushHeader(data: Readable) {
    const header: string = ['Result', 'Delay (ms)', // 'Requests (#)'
    ].join(',');
    data.push(header + '\n');
  }

  public pushStat(data: Readable) {
    const row: string = [this.result++, this.delay(), // this._fragmentsClient.getRequestCount()
    ].join(',');
    data.push(row + '\n');
  }

  public pushFooter(data: Readable) {
    const footer: string = ['TOTAL', this.delay(), // this._fragmentsClient.getRequestCount()
    ].join(',');
    data.push(footer + '\n');
    data.push(null);
  }

  public async runHandle(action: IActionSparqlSerialize, mediaType: string): Promise<IActorSparqlSerializeOutput> {
    const data = new Readable();
    data._read = () => {
      return;
    };

    const resultStream: NodeJS.EventEmitter = action.type === 'bindings' ?
    (<IActorQueryOperationOutputBindings> action).bindingsStream :
    (<IActorQueryOperationOutputQuads> action).quadStream;
    this.pushHeader(data);
    resultStream.on('data', () => this.pushStat(data));
    resultStream.on('end', () => this.pushFooter(data));

    return { data };
  }

  private delay = function()  {
    const time: [number, number] = process.hrtime(this.startTime);
    return time[0] * 1000 + (time[1] / 1000000);
  };

}

export interface IActorSparqlSerializeStatsArgs extends IActorSparqlSerializeFixedMediaTypesArgs {
  delay(): number;
}
