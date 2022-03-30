import { ActionContext } from '@comunica/core';
import { mediatorDereferenceRule } from '@comunica/reasoning-mocks';
import type { IActionContext } from '@comunica/types';
import 'jest-rdf'; // eslint-disable-line import/no-unassigned-import
import { MediatedRuleSource } from '../lib';

describe('MediatedRuleSource', () => {
  let context: IActionContext;

  beforeEach(() => {
    context = new ActionContext({});
  });

  describe('The MediatedRuleSource module', () => {
    it('should be a function', () => {
      expect(MediatedRuleSource).toBeInstanceOf(Function);
    });
  });

  describe('A MediatedRuleSource instance', () => {
    let source: MediatedRuleSource;

    beforeEach(() => {
      source = new MediatedRuleSource(context, 'my-unnested-rules', { mediatorDereferenceRule });
    });

    describe('match', () => {
      it('should return a stream', async() => {
        expect(await source.get().toArray()).toHaveLength(2);
        // Again - this should use the cache
        expect(await source.get().toArray()).toHaveLength(2);
      });
    });
  });
});
