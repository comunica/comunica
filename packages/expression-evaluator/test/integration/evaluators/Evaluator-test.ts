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
const BF = new BindingsFactory();
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

      expect(mediate.mock.calls.length).toBe(1);
      expect(await evaluator.evaluate(BF.bindings())).toEqual(two);
    });

    // eslint-disable-next-line mocha/no-skipped-tests
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
      expect(mediate.mock.calls.length).toBe(1);
      expect(await evaluator.evaluateAsEBV(BF.bindings())).toEqual(true);
    });

    it('is able to evaluate to false', async() => {
      const evaluator = await factory.run({
        algExpr: getMockExpression('0'),
        context: actionContext,
      });
      expect(await evaluator.evaluateAsEBV(BF.bindings())).toEqual(false);
    });
  });

  describe('evaluateAsEvaluatorExpression', () => {
    it('is able to evaluate', async() => {
      const evaluator = await factory.run({
        algExpr: getMockExpression('1 + 1'),
        context: actionContext,
      });
      expect(mediate.mock.calls.length).toBe(1);
      expect(await evaluator.evaluateAsEvaluatorExpression(BF.bindings())).toEqual(new IntegerLiteral(2));
    });
  });
});
