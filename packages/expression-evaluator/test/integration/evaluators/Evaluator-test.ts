import { BindingsFactory } from '@comunica/bindings-factory';
import type { ActorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import type { ITermFunction, MediatorFunctionFactory } from '@comunica/bus-function-factory';
import { getMockEEActionContext, getMockEEFactory } from '@comunica/jest';
import type { IActionContext } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import { IntegerLiteral } from '../../../lib/expressions';
import { TypeURL as DT } from '../../../lib/util/Consts';
import * as Err from '../../../lib/util/Errors';
import { getMockExpression } from '../../util/utils';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const two = DF.literal('2', DF.namedNode(DT.XSD_INTEGER));

describe('evaluators', () => {
  let factory: ActorExpressionEvaluatorFactory;
  let actionContext: IActionContext;
  let mediate: jest.Mock<ITermFunction, []>;

  beforeEach(() => {
    actionContext = getMockEEActionContext();

    mediate = jest.fn((): ITermFunction => {
      return {
        apply: async() => new IntegerLiteral(2),
        applyOnTerms: () => new IntegerLiteral(2),
        checkArity: () => true,
        supportsTermExpressions: true,
      };
    });
    const resolveAsTwoFuncMediator = <MediatorFunctionFactory> {
      mediate: <any> mediate,
    };

    factory = getMockEEFactory({
      mediatorFunctionFactory: resolveAsTwoFuncMediator,
    });
  });

  describe('evaluate', () => {
    it('is able to evaluate', async() => {
      const evaluator = await factory.run({
        algExpr: getMockExpression('1 + 1'),
        context: actionContext,
      });

      expect(mediate.mock.calls).toHaveLength(1);
      await expect(evaluator.evaluate(BF.bindings())).resolves.toEqual(two);
    });

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('has proper extended XSD type support', async() => {
      const evaluator = await factory.run({
        algExpr: getMockExpression('1 + "1"^^<http://example.com>'),
        context: actionContext,
      });
      await expect(evaluator.evaluate(BF.bindings())).rejects.toThrow(Err.InvalidArgumentTypes);
    });
  });

  describe('evaluateAsEBV', () => {
    it('is able to evaluate to true', async() => {
      const evaluator = await factory.run({
        algExpr: getMockExpression('1 + 1'),
        context: actionContext,
      });
      expect(mediate.mock.calls).toHaveLength(1);
      await expect(evaluator.evaluateAsEBV(BF.bindings())).resolves.toBe(true);
    });

    it('is able to evaluate to false', async() => {
      const evaluator = await factory.run({
        algExpr: getMockExpression('0'),
        context: actionContext,
      });
      await expect(evaluator.evaluateAsEBV(BF.bindings())).resolves.toBe(false);
    });
  });

  describe('evaluateAsEvaluatorExpression', () => {
    it('is able to evaluate', async() => {
      const evaluator = await factory.run({
        algExpr: getMockExpression('1 + 1'),
        context: actionContext,
      });
      expect(mediate.mock.calls).toHaveLength(1);
      await expect(evaluator.evaluateAsEvaluatorExpression(BF.bindings())).resolves.toEqual(new IntegerLiteral(2));
    });
  });
});
