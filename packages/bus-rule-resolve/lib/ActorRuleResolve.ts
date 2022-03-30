import { Actor } from '@comunica/core';
import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import type { Rule } from '@comunica/reasoning-types';
import type { AsyncIterator } from 'asynciterator';

/**
 * A comunica actor for resolving rules.
 *
 * Actor types:
 * * Input:  IActionRuleResolve:      A quad pattern and an optional context.
 * * Test:   <none>
 * * Output: IActorRuleResolveOutput: The resulting rule stream.
 *
 * @see IActionRuleResolve
 * @see IActorRuleResolveOutput
 */
export abstract class ActorRuleResolve extends Actor<IActionRuleResolve, IActorTest, IActorRuleResolveOutput> {
  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorRuleResolveArgs) {
    super(args);
  }
}

export interface IActionRuleResolve extends IAction {}

export interface IActorRuleResolveOutput extends IActorOutput {
  /**
   * The resulting rule stream.
   */
  data: AsyncIterator<Rule>;
}

export type IActorRuleResolveArgs = IActorArgs<IActionRuleResolve, IActorTest, IActorRuleResolveOutput>;
export type MediatorRuleResolve = Mediate<IActionRuleResolve, IActorRuleResolveOutput>;
