import { RegularOperator } from '@comunica/expression-evaluator';
import * as E from '@comunica/expression-evaluator/lib/expressions';
import { getMockExpression } from '@comunica/expression-evaluator/test/util/utils';
import { getMockEEActionContext, getMockEEFactory } from '@comunica/jest';
import { sparqlFunctions } from '../../lib/implementation/SparqlFunctions';
import { createFuncMediator } from '../util';

describe('lesser than', () => {
  describe('on sparql star tripples', () => {
    it('allows Generalized RDF Triples', async() => {
      const op = sparqlFunctions[RegularOperator.LT];
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
        await getMockEEFactory({
          mediatorFunctionFactory: createFuncMediator(),
        }).run({
          algExpr: getMockExpression(),
          context: getMockEEActionContext(),
        }),
      )).toEqual(new E.BooleanLiteral(true));
    });
  });
});
