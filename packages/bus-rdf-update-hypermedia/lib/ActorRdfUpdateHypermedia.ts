import type { IQuadDestination } from '@comunica/bus-rdf-update-quads';
import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';

/**
 * A comunica actor for rdf-update-hypermedia events.
 *
 * Actor types:
 * * Input:  IActionRdfUpdateHypermedia:      The metadata in the document.
 * * Test:   <none>
 * * Output: IActorRdfUpdateHypermediaOutput: An RDF destination.
 *
 * @see IActionRdfUpdateHypermedia
 * @see IActorRdfUpdateHypermediaOutput
 */
export abstract class ActorRdfUpdateHypermedia
  extends Actor<IActionRdfUpdateHypermedia, IActorTest, IActorRdfUpdateHypermediaOutput> {
  protected readonly destinationType: string;

  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   * @param destinationType - The destination type.
   */
  public constructor(args: IActorRdfUpdateHypermediaArgs, destinationType: string) {
    super(args);
    this.destinationType = destinationType;
  }

  public async test(action: IActionRdfUpdateHypermedia): Promise<IActorTest> {
    if (action.forceDestinationType && this.destinationType !== action.forceDestinationType) {
      throw new Error(`Actor ${this.name} is not able to handle destination type ${action.forceDestinationType}.`);
    }
    return this.testMetadata(action);
  }

  public abstract testMetadata(action: IActionRdfUpdateHypermedia): Promise<IActorTest>;
}

export interface IActionRdfUpdateHypermedia extends IAction {
  /**
   * The URL of the destination that was fetched.
   */
  url: string;
  /**
   * A metadata key-value mapping.
   */
  metadata: Record<string, any>;
  /**
   * If the destination already exists.
   */
  exists: boolean;
  /**
   * The explicitly requested destination type.
   * If set, the destination type of the actor MUST explicitly match the given forced type.
   */
  forceDestinationType?: string;
}

export interface IActorRdfUpdateHypermediaOutput extends IActorOutput {
  /**
   * The destination for quads.
   */
  destination: IQuadDestination;
}

export type IActorRdfUpdateHypermediaArgs = IActorArgs<
IActionRdfUpdateHypermedia, IActorTest, IActorRdfUpdateHypermediaOutput>;

export type MediatorRdfUpdateHypermedia = Mediate<IActionRdfUpdateHypermedia, IActorRdfUpdateHypermediaOutput>;
