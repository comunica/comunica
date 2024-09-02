import toEqualBindings from './toEqualBindings';
import toEqualBindingsArray from './toEqualBindingsArray';
import toEqualBindingsStream from './toEqualBindingsStream';
import toFailTest from './toFailTest';
import toPassTest from './toPassTest';
import toPassTestVoid from './toPassTestVoid';

export default [
  toEqualBindings,
  toEqualBindingsArray,
  toEqualBindingsStream,
  toPassTest,
  toPassTestVoid,
  toFailTest,
].reduce((acc, matcher) => ({ ...acc, ...matcher }), {});
