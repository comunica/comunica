import type { ActorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import { getMockExpression } from '@comunica/expression-evaluator/test/util/utils';
import { getMockEEActionContext, getMockEEFactory } from '@comunica/utils-jest';

describe('ActorExpressionEvaluatorFactoryDefault', () => {
  describe('An ActorExpressionEvaluatorFactoryDefault instance', () => {
    let actor: ActorExpressionEvaluatorFactory;

    beforeEach(() => {
      actor = getMockEEFactory();
    });

    it('should test', async() => {
      await expect(actor.test({
        context: getMockEEActionContext(),
        algExpr: getMockExpression('1'),
      })).resolves.toPassTestVoid();
    });

    it('should run', async() => {
      await expect(actor.run({
        context: getMockEEActionContext(),
        algExpr: getMockExpression('1'),
      }, undefined)).resolves.toMatchObject({});
    });
  });
});
