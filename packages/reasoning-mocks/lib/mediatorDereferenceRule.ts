import type { Rule } from '@comunica/reasoning-types';
import { fromArray } from 'asynciterator';
import { RULES } from './mediatorRuleResolve';

export const mediatorDereferenceRule = <any> {
  async mediate(action: any) {
    return {
      data: fromArray<Rule>(RULES[action.url]),
    };
  },
};
