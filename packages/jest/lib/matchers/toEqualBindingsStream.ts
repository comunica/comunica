import type { BindingsStream } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import toEqualBindingsArray from './toEqualBindingsArray';
const arrayifyStream = require('arrayify-stream');

export default {
  async toEqualBindingsStream(received: BindingsStream, actual: RDF.Bindings[]) {
    return toEqualBindingsArray.toEqualBindingsArray(await arrayifyStream(received), actual);
  },
};
