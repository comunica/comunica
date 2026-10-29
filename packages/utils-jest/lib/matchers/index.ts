import toBeRdfIsomorphic from './toBeRdfIsomorphic';
import toEqualBindings from './toEqualBindings';
import toEqualBindingsArray from './toEqualBindingsArray';
import toEqualBindingsStream from './toEqualBindingsStream';
import toEqualRdfQuad from './toEqualRdfQuad';
import toEqualRdfQuadArray from './toEqualRdfQuadArray';
import toEqualRdfTerm from './toEqualRdfTerm';
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
  toBeRdfIsomorphic,
  toEqualRdfTerm,
  toEqualRdfQuad,
  toEqualRdfQuadArray,
].reduce((acc, matcher) => ({ ...acc, ...matcher }), {});
