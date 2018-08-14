import {ActorInit, IActionInit, IActorOutputInit} from "@comunica/bus-init";
import {IActionRdfParse, IActionRootRdfParse, IActorOutputRootRdfParse, IActorRdfParseOutput,
  IActorTestRootRdfParse} from "@comunica/bus-rdf-parse";
import {Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import * as RdfString from "rdf-string";
import {PassThrough, Readable} from "stream";

/**
 * An RDF Parse actor that listens on the 'init' bus.
 *
 * It requires a mediator that is defined over the 'rdf-parse' bus,
 * and a mediaType that identifies the RDF serialization.
 */
export class ActorInitRdfParse extends ActorInit implements IActorInitRdfParseArgs {

  public readonly mediatorRdfParse: Mediator<Actor<IActionRootRdfParse, IActorTestRootRdfParse,
    IActorOutputRootRdfParse>, IActionRootRdfParse, IActorTestRootRdfParse, IActorOutputRootRdfParse>;
  public readonly mediaType: string;

  constructor(args: IActorInitRdfParseArgs) {
    super(args);
  }

  public async test(action: IActionInit): Promise<IActorTest> {
    return null;
  }

  public async run(action: IActionInit): Promise<IActorOutputInit> {
    const mediaType: string = action.argv.length > 0 ? action.argv[0] : this.mediaType;
    const parseAction: IActionRdfParse = { input: action.stdin, baseIRI: action.argv.length > 1 ? action.argv[1] : '' };
    const result: IActorRdfParseOutput = (await this.mediatorRdfParse.mediate(
      { context: action.context, handle: parseAction, handleMediaType: mediaType })).handle;

    result.quads.on('data', (quad) => readable.push(JSON.stringify(RdfString.quadToStringQuad(quad)) + '\n'));
    result.quads.on('end', () => readable.push(null));
    const readable = new Readable();
    readable._read = () => {
      return;
    };

    return { stdout: readable, stderr: new PassThrough() };
  }

}

export interface IActorInitRdfParseArgs extends IActorArgs<IActionInit, IActorTest, IActorOutputInit> {
  mediatorRdfParse: Mediator<Actor<IActionRootRdfParse, IActorTestRootRdfParse,
    IActorOutputRootRdfParse>, IActionRootRdfParse, IActorTestRootRdfParse, IActorOutputRootRdfParse>;
  mediaType: string;
}
