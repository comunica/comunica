const A = require('asynciterator');

const { AsyncIterator } = A;
A.instances = [];

// Override with your own, then call the original
A.AsyncIterator = function() {
  A.instances.push(this);
  return new AsyncIterator(this, arguments);
}

// Extend the original class
A.AsyncIterator.prototype = Object.create(AsyncIterator.prototype);
