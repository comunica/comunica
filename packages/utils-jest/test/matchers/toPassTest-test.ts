import { failTest, passTest } from '@comunica/core';
import '../../lib';

describe('toPassTest', () => {
  it('should not succeed for a failed test', () => {
    expect(failTest('abc')).not.toPassTest('abc');
  });

  it('should succeed for a passed test', () => {
    expect(passTest(123)).toPassTest(123);
  });

  it('should not succeed for non-equal passed test value', () => {
    expect(passTest(123)).not.toPassTest(456);
  });

  it('should fail for equal fail message', () => {
    expect(() => expect(failTest('abc')).toPassTest(123))
      .toThrow(`expected a failed test result "abc" to pass to value "123"`);
  });

  it('should not fail for passed test', () => {
    expect(() => expect(passTest(123)).not.toPassTest(123))
      .toThrow(`expected passed test result "123" not to pass`);
  });

  it('should fail for non-equal pass message', () => {
    expect(() => expect(passTest(123)).toPassTest(456))
      .toThrow(`expected a passed test result "123" to pass to value "456"`);
  });
});
