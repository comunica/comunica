import { RegularOperator } from '@comunica/expression-evaluator';
import * as E from '@comunica/expression-evaluator/lib/expressions';
import { getMockEEActionContext, getMockExpression } from '@comunica/expression-evaluator/test/util/utils';
import { getMockEEFactory } from '@comunica/jest';
import { regularFunctions } from '../../lib/implementation/RegularFunctions';
import { createFuncMediator } from '../util';

describe('lesser than', () => {
  describe('on sparql star tripples', () => {
    it('allows Generalized RDF Triples', async() => {
      const op = regularFunctions[RegularOperator.LT];
      const dg = new E.DefaultGraph();
      expect(op.applyOnTerms(
        [
          new E.Quad(
            new E.IntegerLiteral(2),
            new E.IntegerLiteral(2),
            new E.IntegerLiteral(2),
            dg,
          ),
          new E.Quad(
            new E.IntegerLiteral(2),
            new E.IntegerLiteral(3),
            new E.IntegerLiteral(2),
            dg,
          ),
        ],
        (await getMockEEFactory({
          mediatorFunctions: createFuncMediator(),
        }).run({
          algExpr: getMockExpression(),
          context: getMockEEActionContext(),
        })).expressionEvaluator,
      )).toEqual(new E.BooleanLiteral(true));
    });
  });
});
