import { Bus } from '@comunica/core';
import { getMockExpression } from '@comunica/expression-evaluator/test/util/utils';
import { getMockEEActionContext, getMockEEFactory } from '@comunica/jest';
import type { ActorExpressionEvaluatorFactoryBase } from '../lib';

describe('ActorExpressionEvaluatorFactoryBase', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorExpressionEvaluatorFactoryBase instance', () => {
    let actor: ActorExpressionEvaluatorFactoryBase;

    beforeEach(() => {
      actor = getMockEEFactory();
    });

    it('should test', () => {
      return expect(actor.test({
        context: getMockEEActionContext(),
        algExpr: getMockExpression('1'),
      })).resolves.toEqual(true);
    });

    it('should run', () => {
      return expect(actor.run({
        context: getMockEEActionContext(),
        algExpr: getMockExpression('1'),
      })).resolves.toMatchObject({});
    });
  });
});
