import toEqualBindings from './toEqualBindings.js';
import toEqualBindingsArray from './toEqualBindingsArray.js';
import toEqualBindingsStream from './toEqualBindingsStream.js';

export default [
  toEqualBindings,
  toEqualBindingsArray,
  toEqualBindingsStream,
].reduce((acc, matcher) => ({ ...acc, ...matcher }), {});
