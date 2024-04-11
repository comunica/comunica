import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { IQuerySourceWrapper, QuerySourceUnidentifiedExpanded } from '@comunica/types';

/**
 * A comunica actor for query-source-identify events.
 *
 * Actor types:
 * * Input:  IActionQuerySourceIdentify:      An unidentified query source.
 * * Test:   <none>
 * * Output: IActorQuerySourceIdentifyOutput: An identified query source.
 *
 * @see IActionQuerySourceIdentify
 * @see IActorQuerySourceIdentifyOutput
 */
export abstract class ActorQuerySourceIdentify
  extends Actor<IActionQuerySourceIdentify, IActorTest, IActorQuerySourceIdentifyOutput> {
  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorQuerySourceIdentifyArgs) {
    super(args);
  }
}

export interface IActionQuerySourceIdentify extends IAction {
  /**
   * An unidentified query source.
   */
  querySourceUnidentified: QuerySourceUnidentifiedExpanded;
}

export interface IActorQuerySourceIdentifyOutput extends IActorOutput {
  /**
   * An identified query source.
   */
  querySource: IQuerySourceWrapper;
}

export type IActorQuerySourceIdentifyArgs = IActorArgs<
IActionQuerySourceIdentify,
IActorTest,
IActorQuerySourceIdentifyOutput
>;

export type MediatorQuerySourceIdentify = Mediate<
IActionQuerySourceIdentify,
IActorQuerySourceIdentifyOutput
>;
