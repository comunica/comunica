/* eslint-disable import/first */
(<any> window).process = {
  env: {},
};

import expect from 'expect';
import jest from 'jest-mock';

// Add missing Jest functions
window.test = window.it;
window.test.each = inputs => (testName, test) => {
  for (const args of inputs) {
    window.it(testName, () => test(...args));
  }
};
window.test.todo = function() {};
(<any>window).jest = jest;
(<any>window).expect = expect;
