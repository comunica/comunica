import type { TermFunctionBase } from '@comunica/bus-function-factory';
import { SparqlOperator } from '@comunica/expression-evaluator';
import * as Eval from '@comunica/expression-evaluator';
import { getMockExpression } from '@comunica/expression-evaluator/test/util/utils';
import { getMockEEActionContext, getMockEEFactory } from '@comunica/jest';
import { sparqlFunctions } from '../../lib/implementation/SparqlFunctions';
import { createFuncMediator } from '../../../bus-function-factory/test/util';

describe('lesser than', () => {
  describe('on sparql star tripples', () => {
    it('allows Generalized RDF Triples', async() => {
      const op = <TermFunctionBase> sparqlFunctions[SparqlOperator.LT];
      const dg = new Eval.DefaultGraph();
      expect(op.applyOnTerms(
        [
          new Eval.Quad(
            new Eval.IntegerLiteral(2),
            new Eval.IntegerLiteral(2),
            new Eval.IntegerLiteral(2),
            dg,
          ),
          new Eval.Quad(
            new Eval.IntegerLiteral(2),
            new Eval.IntegerLiteral(3),
            new Eval.IntegerLiteral(2),
            dg,
          ),
        ],
        await getMockEEFactory({
          mediatorFunctionFactory: createFuncMediator(),
        }).run({
          algExpr: getMockExpression(),
          context: getMockEEActionContext(),
        }),
      )).toEqual(new Eval.BooleanLiteral(true));
    });
  });
});
