// eslint-disable-next-line import/no-nodejs-modules
import { inspect } from 'node:util';
import type { TestResult } from '@comunica/core';
import { equals } from '@jest/expect-utils';

export default {
  toPassTest(received: TestResult<any>, actual: any) {
    if (!received.isPassed()) {
      return {
        message: () => `expected a failed test result "${received.getFailMessage()}" to pass to value "${actual}"`,
        pass: false,
      };
    }

    if (!equals(received.get(), actual)) {
      return {
        message: () => `expected a passed test result "${inspect(received.get())}" to pass to value "${actual}"`,
        pass: false,
      };
    }

    return {
      message: () => `expected passed test result "${inspect(received.get())}" not to pass`,
      pass: true,
    };
  },
};
