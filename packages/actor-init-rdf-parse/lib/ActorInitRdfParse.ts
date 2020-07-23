import { PassThrough, Readable } from 'stream';
import { ActorInit, IActionInit, IActorOutputInit } from '@comunica/bus-init';
import {
  IActionHandleRdfParse,
  IActionRdfParse,

  IActorOutputHandleRdfParse,

  IActorRdfParseOutput,
  IActorTestHandleRdfParse,
} from '@comunica/bus-rdf-parse';
import { Actor, IActorArgs, IActorTest, Mediator } from '@comunica/core';
import * as RdfString from 'rdf-string';

/**
 * An RDF Parse actor that listens on the 'init' bus.
 *
 * It requires a mediator that is defined over the 'rdf-parse' bus,
 * and a mediaType that identifies the RDF serialization.
 */
export class ActorInitRdfParse extends ActorInit implements IActorInitRdfParseArgs {
  public readonly mediatorRdfParse: Mediator<
  Actor<IActionHandleRdfParse, IActorTestHandleRdfParse, IActorOutputHandleRdfParse>,
  IActionHandleRdfParse, IActorTestHandleRdfParse, IActorOutputHandleRdfParse>;

  public readonly mediaType: string;

  public constructor(args: IActorInitRdfParseArgs) {
    super(args);
  }

  public async test(action: IActionInit): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionInit): Promise<IActorOutputInit> {
    const mediaType: string = action.argv.length > 0 ? action.argv[0] : this.mediaType;
    const parseAction: IActionRdfParse = { input: action.stdin, baseIRI: action.argv.length > 1 ? action.argv[1] : '' };
    const result: IActorRdfParseOutput = (await this.mediatorRdfParse.mediate(
      { context: action.context, handle: parseAction, handleMediaType: mediaType },
    )).handle;

    result.quads.on('data', quad => readable.push(`${JSON.stringify(RdfString.quadToStringQuad(quad))}\n`));
    result.quads.on('end', () => readable.push(null));
    const readable = new Readable();
    readable._read = () => {
      // Do nothing
    };

    return { stdout: readable, stderr: new PassThrough() };
  }
}

export interface IActorInitRdfParseArgs extends IActorArgs<IActionInit, IActorTest, IActorOutputInit> {
  mediatorRdfParse: Mediator<
  Actor<IActionHandleRdfParse, IActorTestHandleRdfParse, IActorOutputHandleRdfParse>,
  IActionHandleRdfParse, IActorTestHandleRdfParse, IActorOutputHandleRdfParse>;
  mediaType: string;
}
