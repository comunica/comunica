import type { BindingsStream } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import toEqualBindingsArray from './toEqualBindingsArray';

export default {
  async toEqualBindingsStream(received: BindingsStream, actual: RDF.Bindings[]) {
    return toEqualBindingsArray.toEqualBindingsArray(await arrayifyStream(received), actual);
  },
};
