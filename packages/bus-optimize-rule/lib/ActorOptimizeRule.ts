import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { Rule } from '@comunica/reasoning-types';
import type { IActionContext } from '@comunica/types';
import type { AsyncIterator } from 'asynciterator';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica actor for optimizing reasoning rules
 *
 * Actor types:
 * * Input:  IActionOptimizeRule:      TODO: fill in.
 * * Test:   <none>
 * * Output: IActorOptimizeRuleOutput: TODO: fill in.
 *
 * @see IActionOptimizeRule
 * @see IActorOptimizeRuleOutput
 */
export abstract class ActorOptimizeRule extends Actor<IActionOptimizeRule, IActorTest, IActorOptimizeRuleOutput> {
  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorOptimizeRuleArgs) {
    super(args);
  }
}

export interface IActionOptimizeRule extends IAction {
  rules: AsyncIterator<Rule>;
  /**
   * An optional pattern to to restrict the rules to infer for
   */
  pattern?: Algebra.Pattern;
}

export interface IActorOptimizeRuleOutput extends IActorOutput {
  rules: AsyncIterator<Rule>;
  pattern?: Algebra.Pattern;
  context: IActionContext;
}

export type MediatorOptimizeRule = Mediate<IActionOptimizeRule, IActorOptimizeRuleOutput>;

export type IActorOptimizeRuleArgs = IActorArgs<IActionOptimizeRule, IActorTest, IActorOptimizeRuleOutput>;
