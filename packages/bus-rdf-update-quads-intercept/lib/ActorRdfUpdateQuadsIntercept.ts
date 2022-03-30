import type {
  IActionRdfUpdateQuads,
  IActorRdfUpdateQuadsArgs,
  IActorRdfUpdateQuadsOutput,
  MediatorRdfUpdateQuads,
} from '@comunica/bus-rdf-update-quads';
import { ActorRdfUpdateQuads } from '@comunica/bus-rdf-update-quads';
import { Actor, IActorArgs, IActorTest } from '@comunica/core';

// TODO: Remove this module my using something like 'reasoning groups'

/**
 * A comunica actor for rdf-update-quads-intercept events.
 *
 * Actor types:
 * * Input:  IActionRdfUpdateQuadsIntercept:      TODO: fill in.
 * * Test:   <none>
 * * Output: IActorRdfUpdateQuadsInterceptOutput: TODO: fill in.
 *
 * @see IActionRdfUpdateQuadsIntercept
 * @see IActorRdfUpdateQuadsInterceptOutput
 */
export abstract class ActorRdfUpdateQuadsIntercept extends Actor<IActionRdfUpdateQuadsIntercept, IActorTest, IActorRdfUpdateQuadsInterceptOutput> {
  public readonly mediatorRdfUpdateQuads: MediatorRdfUpdateQuads;

  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorRdfUpdateQuadsInterceptArgs) {
    super(args);
  }

  // Public abstract execute(action: IActionRdfUpdateQuadsIntercept, cb: () => void): Promise<void>;

  // public async test(action: IActionRdfUpdateQuads): Promise<IActorTest> {
  //   return true;
  // }

  public abstract run(action: IActionRdfUpdateQuadsIntercept): Promise<IActorRdfUpdateQuadsInterceptOutput>;

  // {
  //   const { execute } = await this.mediatorRdfUpdateQuads.mediate(action);
  //   return {
  //     execute: () => this.execute(action, execute)
  //   }

  //   // return this.mediatorRdfUpdateQuads.mediate(await this.runIntercept(action));
  // }
}

export interface IActorRdfUpdateQuadsInterceptArgs extends IActorArgs<IActionRdfUpdateQuadsIntercept, IActorTest, IActorRdfUpdateQuadsInterceptOutput> {
  mediatorRdfUpdateQuads: MediatorRdfUpdateQuads;
}

export type IActionRdfUpdateQuadsIntercept = IActionRdfUpdateQuads;
export type IActorRdfUpdateQuadsInterceptOutput = IActorRdfUpdateQuadsOutput;
export type MediatorRdfUpdateQuadsIntercept = MediatorRdfUpdateQuads;
