import { getMockExpression } from '@comunica/expression-evaluator/test/util/utils';
import { getMockEEActionContext, getMockMediatorFunctionFactory } from '@comunica/jest';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra } from 'sparqlalgebrajs';
import { AlgebraTransformer } from '../lib/AlgebraTransformer';

const DF = new DataFactory();

// https://www.w3.org/TR/sparql11-query/#ebv
// Using && as utility to force EBV
describe('the coercion of RDF terms to it\'s EBV like', () => {
  const transformer = new AlgebraTransformer(getMockEEActionContext(), getMockMediatorFunctionFactory());

  function testCannotCoerce(expression: Algebra.Expression) {
    it(`should not coerce ${expression.expressionType}`, async() => {
      const transformed = await transformer.transformAlgebra(expression);
      expect(() => (<any> transformed).coerceEBV()).toThrow();
    });
  }

  describe('raw algebra test', () => {
    testCannotCoerce(getMockExpression('?a'));
    testCannotCoerce(getMockExpression('<http://example.com>'));
  });
});
