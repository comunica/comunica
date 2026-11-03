import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { IQueryEngine, IWarmupOptions } from '@comunica/types';

/**
 * A comunica actor for warmup events,
 * which warm up a query engine before it handles actual queries.
 *
 * Actor types:
 * * Input:  IActionWarmup:      The engine to warm up, and the maximum number of query executions and duration.
 * * Test:   <none>
 * * Output: IActorWarmupOutput: The number of query executions.
 *
 * @see IActionWarmup
 * @see IActorWarmupOutput
 */
export abstract class ActorWarmup<TS = undefined>
  extends Actor<IActionWarmup, IActorTest, IActorWarmupOutput, TS> {
  /**
   * @param args -
   *   \ @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   *   \ @defaultNested {Warming up failed: none of the configured actors were able to warm up} busFailMessage
   */
  public constructor(args: IActorWarmupArgs<TS>) {
    super(args);
  }
}

export interface IActionWarmup extends IAction, IWarmupOptions {
  /**
   * The engine to warm up.
   * Its query methods also accept the context of this action.
   */
  engine: IQueryEngine<any, any>;
}

export interface IActorWarmupOutput extends IActorOutput {
  /**
   * The number of query executions.
   */
  executions: number;
}

export type IActorWarmupArgs<TS = undefined> = IActorArgs<IActionWarmup, IActorTest, IActorWarmupOutput, TS>;

export type MediatorWarmup = Mediate<IActionWarmup, IActorWarmupOutput>;
