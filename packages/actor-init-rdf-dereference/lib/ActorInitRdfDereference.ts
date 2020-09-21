import { Readable } from 'stream';
import type { IActionInit, IActorOutputInit } from '@comunica/bus-init';
import { ActorInit } from '@comunica/bus-init';
import type { IActionRdfDereference, IActorRdfDereferenceOutput } from '@comunica/bus-rdf-dereference';
import type { IActorRdfParseOutput } from '@comunica/bus-rdf-parse';
import type { Actor, IActorArgs, IActorTest, Mediator } from '@comunica/core';
import * as RdfString from 'rdf-string';

/**
 * An RDF Parse actor that listens on the 'init' bus.
 *
 * It requires a mediator that is defined over the 'rdf-parse' bus,
 * and a mediaType that identifies the RDF serialization.
 */
export class ActorInitRdfDereference extends ActorInit implements IActorInitRdfParseArgs {
  public readonly mediatorRdfDereference: Mediator<Actor<IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>,
  IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>;

  public readonly url?: string;

  public constructor(args: IActorInitRdfParseArgs) {
    super(args);
  }

  public async test(action: IActionInit): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionInit): Promise<IActorOutputInit> {
    const dereference: IActionRdfDereference = {
      context: action.context,
      url: action.argv.length > 0 ? action.argv[0] : this.url ?? '',
    };
    if (!dereference.url) {
      throw new Error('A URL must be given either in the config or as CLI arg');
    }
    const result: IActorRdfParseOutput = await this.mediatorRdfDereference.mediate(dereference);

    const readable = new Readable();
    readable._read = () => {
      // Do nothing
    };
    result.quads.on('data', quad => readable.push(`${JSON.stringify(RdfString.quadToStringQuad(quad))}\n`));
    result.quads.on('end', () => readable.push(null));

    return { stdout: readable };
  }
}

export interface IActorInitRdfParseArgs extends IActorArgs<IActionInit, IActorTest, IActorOutputInit> {
  mediatorRdfDereference: Mediator<Actor<IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>,
  IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>;
  url?: string;
}
