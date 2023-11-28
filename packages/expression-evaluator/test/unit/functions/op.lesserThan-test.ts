import { getMockEEFactory } from '@comunica/jest';
import { RegularOperator } from '../../../lib';
import * as E from '../../../lib/expressions';
import { regularFunctions } from '../../../lib/functions';
import { getMockEEActionContext, getMockExpression } from '../../util/utils';

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
        await getMockEEFactory().createEvaluator(getMockExpression(), getMockEEActionContext()),
      )).toEqual(new E.BooleanLiteral(true));
    });
  });
});
