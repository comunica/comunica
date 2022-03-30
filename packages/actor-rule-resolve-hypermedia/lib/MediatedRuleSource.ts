import type { MediatorDereferenceRule } from '@comunica/bus-dereference-rule';
import type { IRuleSource } from '@comunica/bus-rule-resolve';
import type { Rule } from '@comunica/reasoning-types';
import type { IActionContext } from '@comunica/types';
import { fromArray, wrap } from 'asynciterator';
import type { AsyncIterator } from 'asynciterator';

/**
 * A lazy rule source
 */
export class MediatedRuleSource implements IRuleSource {
  private cache: Rule[] | undefined;

  public constructor(
    public readonly context: IActionContext,
    public readonly url: string,
    public readonly mediators: IMediatedRuleSourceArgs,
  ) {

  }

  public get(): AsyncIterator<Rule> {
    if (this.cache) {
      return fromArray(this.cache);
    }

    const _data = wrap<Rule>(this.mediators.mediatorDereferenceRule.mediate({
      url: this.url,
      context: this.context,
    }).then(({ data }) => data));

    this.cache = [];
    return _data.map(rule => {
      this.cache?.push(rule);
      return rule;
    });
  }
}

export interface IMediatedRuleSourceArgs {
  mediatorDereferenceRule: MediatorDereferenceRule;
}
