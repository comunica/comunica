import { literal } from '@rdfjs/data-model';

import { AsyncEvaluator, ExpressionError } from '..';
import { Bindings } from '../lib/core/Types';
import { Example } from '../util/Util';

describe('the evaluation of', () => {
  describe('faulty expressions', () => {
    it('should throw ExpressionErrors', () => {
      const expr = new Example('str("testString") > 10');
      expect(expr.evaluate()).rejects.toThrow(ExpressionError);
    });
  });
  describe('expressions with unimplemented features', () => {
    it('should error', () => {
      expect(() => new Example('avg(strlen(?a)) > 10').evaluate()).toThrow();
    });
  });
});
