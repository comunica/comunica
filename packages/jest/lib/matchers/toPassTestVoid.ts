// eslint-disable-next-line import/no-nodejs-modules
import { inspect } from 'node:util';
import type { TestResult } from '@comunica/core';

export default {
  toPassTestVoid(received: TestResult<any>) {
    if (!received.isPassed()) {
      return {
        message: () => `expected a failed test result "${received.getFailMessage()}" to pass to a void value`,
        pass: false,
      };
    }
    if (received.get() !== true) {
      return {
        message: () => `expected passed test result "${inspect(received.get())}" to be a void value`,
        pass: false,
      };
    }
    return {
      message: () => `expected passed void test result not to be a void value`,
      pass: true,
    };
  },
};
