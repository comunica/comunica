// eslint-disable-next-line import/no-nodejs-modules
import { inspect } from 'node:util';
import type { TestResult } from '@comunica/core';

export default {
  toFailTest(received: TestResult<any>, actual: string) {
    if (!received.isFailed()) {
      return {
        message: () => `expected a passed test result "${inspect(received.get())}" to fail to message "${actual}"`,
        pass: false,
      };
    }

    if (!received.getFailMessage().includes(actual)) {
      return {
        message: () => `expected a failed test result "${received.getFailMessage()}" to fail to message "${actual}"`,
        pass: false,
      };
    }

    return {
      message: () => `expected failed test result "${received.getFailMessage()}" not to fail`,
      pass: true,
    };
  },
};
