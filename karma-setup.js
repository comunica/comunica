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
window.jest = jest;
window.expect = expect;
