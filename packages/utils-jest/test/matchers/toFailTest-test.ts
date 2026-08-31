import { failTest, passTest } from '@comunica/core';
import '../../lib';

describe('toFailTest', () => {
  it('should succeed for an equal fail message', () => {
    expect(failTest('abc')).toFailTest('abc');
  });

  it('should not succeed for non-equal fail message', () => {
    expect(failTest('abc')).not.toFailTest('def');
  });

  it('should not succeed for a passed test', () => {
    expect(passTest(123)).not.toFailTest('def');
  });

  it('should not fail for equal fail message', () => {
    expect(() => expect(failTest('abc')).not.toFailTest('abc'))
      .toThrow(`expected failed test result "abc" not to fail`);
  });

  it('should fail for non-equal fail message', () => {
    expect(() => expect(failTest('abc')).toFailTest('def'))
      .toThrow(`expected a failed test result "abc" to fail to message "def"`);
  });

  it('should fail for passed test', () => {
    expect(() => expect(passTest(123)).toFailTest('def'))
      .toThrow(`expected a passed test result "123" to fail to message "def"`);
  });
});
