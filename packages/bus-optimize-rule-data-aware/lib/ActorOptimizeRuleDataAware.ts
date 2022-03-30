import type { IAction, IActorArgs, IActorOutput, IActorTest } from '@comunica/core';
import { Actor } from '@comunica/core';

/**
 * A comunica actor for optimize-rule-data-aware events.
 *
 * Actor types:
 * * Input:  IActionOptimizeRuleDataAware:      TODO: fill in.
 * * Test:   <none>
 * * Output: IActorOptimizeRuleDataAwareOutput: TODO: fill in.
 *
 * @see IActionOptimizeRuleDataAware
 * @see IActorOptimizeRuleDataAwareOutput
 */
export abstract class ActorOptimizeRuleDataAware extends
  Actor<IActionOptimizeRuleDataAware, IActorTest, IActorOptimizeRuleDataAwareOutput> {
  public constructor(args: IActorOptimizeRuleDataAwareArgs) {
    super(args);
  }
}

export interface IActionOptimizeRuleDataAware extends IAction {

}

export interface IActorOptimizeRuleDataAwareOutput extends IActorOutput {

}

export type IActorOptimizeRuleDataAwareArgs =
IActorArgs<IActionOptimizeRuleDataAware, IActorTest, IActorOptimizeRuleDataAwareOutput>;
