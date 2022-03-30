import type { IActorTest } from '@comunica/core';
import type { Rule } from '@comunica/reasoning-types';
import type { IActionContext } from '@comunica/types';
import type { AsyncIterator } from 'asynciterator';
import type { IActorRuleResolveArgs, IActionRuleResolve, IActorRuleResolveOutput } from './ActorRuleResolve';
import { ActorRuleResolve } from './ActorRuleResolve';

/**
 * A base implementation for rdf-resolve-quad-pattern events
 * that wraps around an {@link IRuleSource}.
 *
 * @see IRuleSource
 */
export abstract class ActorRuleResolveSource extends ActorRuleResolve {
  public constructor(args: IActorRuleResolveArgs) {
    super(args);
  }

  public abstract test(action: IActionRuleResolve): Promise<IActorTest>;

  public async run(action: IActionRuleResolve): Promise<IActorRuleResolveOutput> {
    return { data: this.getSource(action.context).get() };
  }

  /**
   * Get a source instance for the given context.
   */
  protected abstract getSource(context: IActionContext): IRuleSource;
}

/**
 * A lazy rule source.
 */
export interface IRuleSource {
  /**
   * Returns a (possibly lazy) stream that processes all quads matching the pattern.
   * @return {AsyncIterator<Rule>} The resulting rule stream.
   */
  get: () => AsyncIterator<Rule>;
}
