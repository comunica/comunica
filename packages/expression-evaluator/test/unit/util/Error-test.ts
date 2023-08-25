import { DataFactory } from 'rdf-data-factory';
import { ExpressionError, isExpressionError } from '../../../lib';
import {
  ExtensionFunctionError,
  InvalidLexicalForm,
} from '../../../lib/util/Errors';

const DF = new DataFactory();

describe('Errors', () => {
  describe('isExpressionError', () => {
    it('on ExpressionError subclass', () => {
      expect(isExpressionError(new InvalidLexicalForm(DF.literal('foo')))).toEqual(true);
    });

    it('on ExpressionError', () => {
      expect(isExpressionError(new ExpressionError('apple'))).toEqual(true);
    });

    it('on plain Error', () => {
      expect(isExpressionError(new Error('foo'))).toEqual(false);
    });
  });

  describe('ExtensionFunctionError', () => {
    it('with Error', () => {
      expect((new ExtensionFunctionError('test', new Error('error'))).message)
        .toContain('Error thrown in test: error');
    });

    it('with Error without backtrace', () => {
      const error = new Error('error');
      error.stack = undefined;
      expect((new ExtensionFunctionError('test', error)).message).toEqual('Error thrown in test: error');
    });

    it('with other input', () => {
      expect((new ExtensionFunctionError('test', 'error')).message).toEqual('Error thrown in test');
    });
  });
});
