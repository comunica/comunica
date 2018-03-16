import {Bindings, BindingsStream} from "@comunica/bus-query-operation";
import {IActionRdfParse, IActionRootRdfParse, IActorOutputRootRdfParse, IActorRdfParseOutput,
  IActorTestRootRdfParse} from "@comunica/bus-rdf-parse";
import {ActorRdfResolveQuadPattern, IActionRdfResolveQuadPattern,
  IActorRdfResolveQuadPatternOutput} from "@comunica/bus-rdf-resolve-quad-pattern";
import {Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import {AsyncIterator, BufferedIterator} from "asynciterator";
import {blankNode, literal, namedNode, variable} from "rdf-data-model";
import * as RDF from "rdf-js";

/**
 * A comunica Stream SSE RDF Resolve Quad Pattern Actor.
 */
export class ActorRdfResolveQuadPatternStreamSse extends ActorRdfResolveQuadPattern
  implements IActorRdfResolveQuadPatternStreamSseArgs {

  public readonly mediatorRdfParse: Mediator<Actor<IActionRootRdfParse, IActorTestRootRdfParse,
    IActorOutputRootRdfParse>, IActionRootRdfParse, IActorTestRootRdfParse, IActorOutputRootRdfParse>;

  constructor(args: IActorRdfResolveQuadPatternStreamSseArgs) {
    super(args);
  }

  public async test(action: IActionRdfResolveQuadPattern): Promise<IActorTest> {
    if (!action.context || !action.context.sources || action.context.sources.length !== 1
      || action.context.sources[0].type !== 'stream-sse' || !action.context.sources[0].value) {
      throw new Error(this.name
        + ' requires a single source with a \'stream-sse\' endpoint to be present in the context.');
    }
    return true;
  }

  public async run(action: IActionRdfResolveQuadPattern): Promise<IActorRdfResolveQuadPatternOutput> {
    const data: BufferedIterator<RDF.Quad> = new BufferedIterator();
    const mediaType = 'application/n-quads'; // TODO: hardcoded for now
    const streamUrl: string = action.context.sources[0].value;
    const source = new (require('eventsource'))(streamUrl);
    source.onmessage = async (event: any) => {
      const responseStream: NodeJS.ReadableStream = require('streamify-string')(event.data);
      const parseOutput: IActorRdfParseOutput = (await this.mediatorRdfParse.mediate(
        { handle: { input: responseStream }, handleMediaType: mediaType })).handle;
      parseOutput.quads.on('data', (quad: RDF.Quad) => {
        data._push(quad);
      });
      parseOutput.quads.on('error', (error: Error) => {
        data.emit('error', error);
      });
      // TODO: filter quads for quad pattern
      // This is a continuous stream, so the iterator is never closed!
    };
    source.onerror = (error: any) => {
      data.emit('error', new Error('An error occured inside an SSE event souce: ' + streamUrl));
    };
    return { data };
  }

}

export interface IActorRdfResolveQuadPatternStreamSseArgs
  extends IActorArgs<IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput> {
  mediatorRdfParse: Mediator<Actor<IActionRootRdfParse, IActorTestRootRdfParse,
    IActorOutputRootRdfParse>, IActionRootRdfParse, IActorTestRootRdfParse, IActorOutputRootRdfParse>;
}
