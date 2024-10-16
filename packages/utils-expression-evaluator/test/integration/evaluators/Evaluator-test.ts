import { ActorFunctionFactoryTermAddition } from '@comunica/actor-function-factory-term-addition';
import type { ActorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import type { ITermFunction, MediatorFunctionFactory } from '@comunica/bus-function-factory';
import { Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { DataFactory } from 'rdf-data-factory';
import { IntegerLiteral, SparqlOperator } from '../../../lib';
import { TypeURL as DT } from '../../../lib/util/Consts';
import * as Err from '../../../lib/util/Errors';
import { getMockEEActionContext, getMockEEFactory } from '../../util/helpers';
import { getMockExpression } from '../../util/utils';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const two = DF.literal('2', DF.namedNode(DT.XSD_INTEGER));

describe('evaluators', () => {
  let factory: ActorExpressionEvaluatorFactory;
  let actionContext: IActionContext;
  let mediate: jest.Mock<ITermFunction, []>;

  beforeEach(async() => {
    actionContext = getMockEEActionContext();

    const additionFunction = await (new ActorFunctionFactoryTermAddition({
      bus: new Bus({ name: 'bus' }),
      name: 'actor',
    })
      .run({
        functionName: SparqlOperator.ADDITION,
        context: actionContext,
        requireTermExpression: true,
      }));

    mediate = jest.fn((): ITermFunction => {
      return additionFunction;
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
      }, undefined);

      expect(mediate.mock.calls).toHaveLength(1);
      await expect(evaluator.evaluate(BF.bindings())).resolves.toEqual(two);
    });

    it('has proper extended XSD type support', async() => {
      const evaluator = await factory.run({
        algExpr: getMockExpression('1 + "1"^^<http://example.com>'),
        context: actionContext,
      }, undefined);
      await expect(evaluator.evaluate(BF.bindings())).rejects.toThrow(Err.InvalidArgumentTypes);
    });
  });

  describe('evaluateAsEBV', () => {
    it('is able to evaluate to true', async() => {
      const evaluator = await factory.run({
        algExpr: getMockExpression('1 + 1'),
        context: actionContext,
      }, undefined);
      expect(mediate.mock.calls).toHaveLength(1);
      await expect(evaluator.evaluateAsEBV(BF.bindings())).resolves.toBe(true);
    });

    it('is able to evaluate to false', async() => {
      const evaluator = await factory.run({
        algExpr: getMockExpression('0'),
        context: actionContext,
      }, undefined);
      await expect(evaluator.evaluateAsEBV(BF.bindings())).resolves.toBe(false);
    });
  });

  describe('evaluateAsEvaluatorExpression', () => {
    it('is able to evaluate', async() => {
      const evaluator = await factory.run({
        algExpr: getMockExpression('1 + 1'),
        context: actionContext,
      }, undefined);
      expect(mediate.mock.calls).toHaveLength(1);
      await expect(evaluator.evaluateAsEvaluatorExpression(BF.bindings())).resolves.toEqual(new IntegerLiteral(2));
    });
  });
});
