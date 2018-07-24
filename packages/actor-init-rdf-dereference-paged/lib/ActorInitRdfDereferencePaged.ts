import {ActorInit, IActionInit, IActorOutputInit} from "@comunica/bus-init";
import {IActionRdfDereferencePaged, IActorRdfDereferencePagedOutput} from "@comunica/bus-rdf-dereference-paged";
import {Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import * as RdfString from "rdf-string";
import {Readable} from "stream";

/**
 * A comunica RDF Dereference Paged Init Actor.
 */
export class ActorInitRdfDereferencePaged extends ActorInit implements IActorInitRdfDereferencePagedArgs {

  public readonly mediatorRdfDereferencePaged: Mediator<Actor<IActionRdfDereferencePaged, IActorTest,
    IActorRdfDereferencePagedOutput>, IActionRdfDereferencePaged, IActorTest, IActorRdfDereferencePagedOutput>;
  public readonly url?: string;

  constructor(args: IActorInitRdfDereferencePagedArgs) {
    super(args);
  }

  public async test(action: IActionInit): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionInit): Promise<IActorOutputInit> {
    const dereference: IActionRdfDereferencePaged = {
      context: action.context,
      url: action.argv.length > 0 ? action.argv[0] : this.url,
    };
    if (!dereference.url) {
      throw new Error('A URL must be given either in the config or as CLI arg');
    }
    const result: IActorRdfDereferencePagedOutput = await this.mediatorRdfDereferencePaged.mediate(dereference);

    result.data.on('data', (quad) => readable.push(JSON.stringify(RdfString.quadToStringQuad(quad)) + '\n'));
    result.data.on('end', () => readable.push(null));
    const readable = new Readable();
    readable._read = () => {
      return;
    };
    readable.push('Metadata: ' + JSON.stringify(await result.firstPageMetadata, null, '  ') + '\n');

    return { stdout: readable };
  }

}

export interface IActorInitRdfDereferencePagedArgs extends IActorArgs<IActionInit, IActorTest, IActorOutputInit> {
  mediatorRdfDereferencePaged: Mediator<Actor<IActionRdfDereferencePaged, IActorTest, IActorRdfDereferencePagedOutput>,
    IActionRdfDereferencePaged, IActorTest, IActorRdfDereferencePagedOutput>;
  url?: string;
}
