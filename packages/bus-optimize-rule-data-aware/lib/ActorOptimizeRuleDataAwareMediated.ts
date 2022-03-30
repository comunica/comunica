import type { IActorArgs, IActorTest } from '@comunica/core';
import type { IActionOptimizeRuleDataAware, IActorOptimizeRuleDataAwareOutput } from './ActorOptimizeRuleDataAware';
import { ActorOptimizeRuleDataAware } from './ActorOptimizeRuleDataAware';

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
export abstract class ActorOptimizeRuleDataAwareMediated extends ActorOptimizeRuleDataAware {
  // TODO: Sort mediation
  public constructor(args: IActorOptimizeRuleDataAwareMediatedArgs) {
    super(args);
  }
}

export interface IActionOptimizeRuleDataAwareMediated extends IActionOptimizeRuleDataAware {

}

export interface IActorOptimizeRuleDataAwareOutputMediated extends IActorOptimizeRuleDataAwareOutput {

}

export type IActorOptimizeRuleDataAwareMediatedArgs =
IActorArgs<IActionOptimizeRuleDataAwareMediated, IActorTest, IActorOptimizeRuleDataAwareOutputMediated>;
