import type { ActorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { AsyncExtensionFunction } from '@comunica/types';
import {
  getMockEEActionContext,
  getMockEEFactory,
  getMockExpression,
} from '@comunica/utils-jest';

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

    it('should run with extensionFunctions in context', async() => {
      const extensionFunctions: Record<string, AsyncExtensionFunction> = {};
      const context = getMockEEActionContext().merge(new ActionContext({
        [KeysInitQuery.extensionFunctions.name]: extensionFunctions,
      }));
      await expect(actor.run({
        context,
        algExpr: getMockExpression('1'),
      }, undefined)).resolves.toMatchObject({});
    });

    it('should throw when both extensionFunctionCreator and extensionFunctions are set', async() => {
      const context = getMockEEActionContext().merge(new ActionContext({
        [KeysInitQuery.extensionFunctionCreator.name]: async() => async() => undefined,
        [KeysInitQuery.extensionFunctions.name]: {},
      }));
      await expect(actor.run({
        context,
        algExpr: getMockExpression('1'),
      }, undefined)).rejects.toThrow(
        'Illegal simultaneous usage of extensionFunctionCreator and extensionFunctions in context',
      );
    });
  });
});
