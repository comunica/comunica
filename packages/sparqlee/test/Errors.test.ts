import { ExpressionError } from '..';
import { Example } from '../util/Util';

describe('the evaluation of', () => {
  describe('faulty expressions', () => {
    it.skip('should throw ExpressionErrors', () => {
      const expr = new Example('str("testString") > 10');
      // expect(expr.evaluate()).rejects.toThrow(ExpressionError);
    });
  });
  describe('expressions with unimplemented features', () => {
    it('should error', () => {
      expect(() => new Example('avg(strlen(?a)) > 10').evaluate()).toThrow();
    });
  });
});
