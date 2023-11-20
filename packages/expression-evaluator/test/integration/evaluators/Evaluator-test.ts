import { BindingsFactory } from '@comunica/bindings-factory';
import { ActionContext } from '@comunica/core';
import { getMockEEFactory } from '@comunica/jest';
import { DataFactory } from 'rdf-data-factory';
import type { ExpressionEvaluatorFactory } from '../../../lib';
import { IntegerLiteral } from '../../../lib/expressions';
import { TypeURL as DT } from '../../../lib/util/Consts';
import * as Err from '../../../lib/util/Errors';
import { getMockExpression } from '../../util/utils';

const DF = new DataFactory();
const BF = new BindingsFactory();
const two = DF.literal('2', DF.namedNode(DT.XSD_INTEGER));

describe('evaluators', () => {
  let factory: ExpressionEvaluatorFactory;
  let actionContext: ActionContext;
  beforeEach(() => {
    factory = getMockEEFactory();
    actionContext = new ActionContext({});
  });

  describe('evaluate', () => {
    it('is able to evaluate', async() => {
      const evaluator = await factory.createEvaluator(getMockExpression('1 + 1'), actionContext);
      expect(await evaluator.evaluate(BF.bindings())).toEqual(two);
    });

    it('has proper default extended XSD type support', async() => {
      const evaluator = await factory.createEvaluator(getMockExpression('1 + 1'), actionContext);
      expect(await evaluator.evaluate(BF.bindings())).toEqual(two);
    });

    it('has proper extended XSD type support', async() => {
      const evaluator = await factory.createEvaluator(getMockExpression('1 + "1"^^<http://example.com>'),
        actionContext);
      await expect(evaluator.evaluate(BF.bindings())).rejects.toThrow(Err.InvalidArgumentTypes);
    });
  });

  describe('evaluateAsEBV', () => {
    it('is able to evaluate to true', async() => {
      const evaluator = await factory.createEvaluator(getMockExpression('1 + 1'), actionContext);
      expect(await evaluator.evaluateAsEBV(BF.bindings())).toEqual(true);
    });

    it('is able to evaluate to false', async() => {
      const evaluator = await factory.createEvaluator(getMockExpression('0'), actionContext);
      expect(await evaluator.evaluateAsEBV(BF.bindings())).toEqual(false);
    });
  });

  describe('evaluateAsInternal', () => {
    it('is able to evaluate', async() => {
      const evaluator = await factory.createEvaluator(getMockExpression('1 + 1'), actionContext);
      expect(await evaluator.evaluateAsInternal(BF.bindings())).toEqual(new IntegerLiteral(2));
    });
  });
});
