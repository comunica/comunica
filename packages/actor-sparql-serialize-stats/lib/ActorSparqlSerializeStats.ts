import {IActorQueryOperationOutputBindings,
  IActorQueryOperationOutputQuads} from "@comunica/bus-query-operation";
import {ActorSparqlSerializeFixedMediaTypes, IActionSparqlSerialize,
  IActorSparqlSerializeFixedMediaTypesArgs, IActorSparqlSerializeOutput} from "@comunica/bus-sparql-serialize";
import {ActionContext} from "@comunica/core";
import {Readable} from "stream";

/**
 * Serializes SPARQL results for testing and debugging.
 */
export class ActorSparqlSerializeStats extends ActorSparqlSerializeFixedMediaTypes {

  constructor(args: IActorSparqlSerializeFixedMediaTypesArgs) {
    super(args);
  }

  public async testHandleChecked(action: IActionSparqlSerialize, context?: ActionContext) {
    if (['bindings', 'quads'].indexOf(action.type) < 0) {
      throw new Error('This actor can only handle bindings streams or quad streams.');
    }
    return true;
  }

  public pushHeader(data: Readable) {
    const header: string = ['Result', 'Delay (ms)',
    ].join(',');
    data.push(header + '\n');
  }

  public pushStat(data: Readable, startTime: [number, number], result: number) {
    const row: string = [result, this.delay(startTime),
    ].join(',');
    data.push(row + '\n');
  }

  public pushFooter(data: Readable, startTime: [number, number]) {
    const footer: string = ['TOTAL', this.delay(startTime),
    ].join(',');
    data.push(footer + '\n');
    data.push(null);
  }

  public async runHandle(action: IActionSparqlSerialize, mediaType: string, context?: ActionContext)
    : Promise<IActorSparqlSerializeOutput> {
    const data = new Readable();
    data._read = () => {
      return;
    };

    const resultStream: NodeJS.EventEmitter = action.type === 'bindings' ?
    (<IActorQueryOperationOutputBindings> action).bindingsStream :
    (<IActorQueryOperationOutputQuads> action).quadStream;

    // TODO: Make initiation timer configurable
    const startTime = process.hrtime();
    let result: number = 1;

    this.pushHeader(data);
    resultStream.on('error', (e) => data.emit('error', e));
    resultStream.on('data', () => this.pushStat(data, startTime, result++));
    resultStream.on('end', () => this.pushFooter(data, startTime));

    return { data };
  }

  public delay(startTime: [number, number]) {
    const time: [number, number] = process.hrtime(startTime);
    return time[0] * 1000 + (time[1] / 1000000);
  }
}
