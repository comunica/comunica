import type { IQuadDestination } from '@comunica/bus-rdf-update-quads';
import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate, TestResult } from '@comunica/core';
import { failTest, Actor } from '@comunica/core';

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
export abstract class ActorRdfUpdateHypermedia<TS = undefined>
  extends Actor<IActionRdfUpdateHypermedia, IActorTest, IActorRdfUpdateHypermediaOutput, TS> {
  protected readonly destinationType: string;

  /* eslint-disable max-len */
  /**
   * @param args -
   *   \ @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   *   \ @defaultNested {RDF hypermedia updating failed: none of the configured actors were able to handle an update for ${action.url}} busFailMessage
   * @param destinationType - The destination type.
   */
  /* eslint-enable max-len */
  public constructor(args: IActorRdfUpdateHypermediaArgs<TS>, destinationType: string) {
    super(args);
    this.destinationType = destinationType;
  }

  public async test(action: IActionRdfUpdateHypermedia): Promise<TestResult<IActorTest, TS>> {
    if (action.forceDestinationType && this.destinationType !== action.forceDestinationType) {
      return failTest(`Actor ${this.name} is not able to handle destination type ${action.forceDestinationType}.`);
    }
    return this.testMetadata(action);
  }

  public abstract testMetadata(action: IActionRdfUpdateHypermedia): Promise<TestResult<IActorTest, TS>>;
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

export type IActorRdfUpdateHypermediaArgs<TS = undefined> = IActorArgs<
IActionRdfUpdateHypermedia,
IActorTest,
IActorRdfUpdateHypermediaOutput,
TS
>;

export type MediatorRdfUpdateHypermedia = Mediate<IActionRdfUpdateHypermedia, IActorRdfUpdateHypermediaOutput>;
