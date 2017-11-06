import {ActorInit, IActionInit, IActorOutputInit} from "@comunica/bus-init";
import {IActionRdfParse, IActionRdfParseOrMediaType, IActorOutputRdfParseOrMediaType,
  IActorRdfParseOutput} from "@comunica/bus-rdf-parse";
import {Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import {PassThrough, Readable} from "stream";

/**
 * An RDF Parse actor that listens to on the 'init' bus.
 *
 * It requires a mediator that is defined over the 'rdf-parse' bus,
 * and a mediaType that identifies the RDF serialization.
 */
export class ActorInitRdfParse extends ActorInit implements IActorInitRdfParseArgs {

  public readonly mediatorRdfParse: Mediator<Actor<IActionRdfParseOrMediaType, IActorTest,
    IActorOutputRdfParseOrMediaType>, IActionRdfParseOrMediaType, IActorTest, IActorOutputRdfParseOrMediaType>;
  public readonly mediaType: string;

  constructor(args: IActorInitRdfParseArgs) {
    super(args);
    if (!this.mediatorRdfParse) {
      throw new Error('A valid "mediatorRdfParse" argument must be provided.');
    }
    if (!this.mediaType) {
      throw new Error('A valid "mediaType" argument must be provided.');
    }
  }

  public async test(action: IActionInit): Promise<IActorTest> {
    return null;
  }

  public async run(action: IActionInit): Promise<IActorOutputInit> {
    const parseAction: IActionRdfParse = { input: action.stdin , mediaType: this.mediaType };
    const result: IActorRdfParseOutput = (await this.mediatorRdfParse.mediate({ parse: parseAction })).parse;

    result.quads.on('data', (quad) => readable.push(JSON.stringify(quad)));
    result.quads.on('end', () => readable.push(null));
    const readable = new Readable();
    readable._read = () => {
      return;
    };

    return { stdout: readable, stderr: new PassThrough() };
  }

}

export interface IActorInitRdfParseArgs extends IActorArgs<IActionInit, IActorTest, IActorOutputInit> {
  mediatorRdfParse: Mediator<Actor<IActionRdfParseOrMediaType, IActorTest,
    IActorOutputRdfParseOrMediaType>, IActionRdfParseOrMediaType, IActorTest, IActorOutputRdfParseOrMediaType>;
  mediaType: string;
}
