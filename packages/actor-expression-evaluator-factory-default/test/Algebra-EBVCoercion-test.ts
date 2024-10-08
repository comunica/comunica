import {
  getMockEEActionContext,
  getMockMediatorFunctionFactory,
} from '@comunica/utils-expression-evaluator/test/util/helpers';
import { getMockExpression } from '@comunica/utils-expression-evaluator/test/util/utils';
import { AlgebraTransformer } from '../lib/AlgebraTransformer';

// https://www.w3.org/TR/sparql11-query/#ebv
// Using && as utility to force EBV
describe('the coercion of RDF terms to it\'s EBV like', () => {
  const transformer = new AlgebraTransformer(getMockEEActionContext(), getMockMediatorFunctionFactory());

  describe('raw algebra test', () => {
    it(`should not coerce variable`, async() => {
      const transformed = await transformer.transformAlgebra(getMockExpression('?a'));
      expect(() => (<any> transformed).coerceEBV()).toThrow('transformed.coerceEBV is not a function');
    });
    it(`should not coerce uri`, async() => {
      const transformed = await transformer.transformAlgebra(getMockExpression('<http://example.com>'));
      expect(() => (<any> transformed).coerceEBV()).toThrow('Cannot coerce term to EBV');
    });
  });
});
