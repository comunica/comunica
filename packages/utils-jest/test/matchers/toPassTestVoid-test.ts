import { failTest, passTest, passTestVoid } from '@comunica/core';
import '../../lib';

describe('toPassTestVoid', () => {
  it('should not succeed for a failed test', () => {
    expect(failTest('abc')).not.toPassTestVoid();
  });

  it('should succeed for a passed test', () => {
    expect(passTestVoid()).toPassTestVoid();
  });

  it('should not succeed for non-equal passed test value', () => {
    expect(passTest(123)).not.toPassTestVoid();
  });

  it('should fail for equal fail message', () => {
    expect(() => expect(failTest('abc')).toPassTestVoid())
      .toThrow(`expected a failed test result "abc" to pass to a void value`);
  });

  it('should not fail for passed test', () => {
    expect(() => expect(passTestVoid()).not.toPassTestVoid())
      .toThrow(`expected passed void test result not to be a void value`);
  });

  it('should fail for non-equal pass message', () => {
    expect(() => expect(passTest(123)).toPassTestVoid())
      .toThrow(`expected passed test result "123" to be a void value`);
  });
});
