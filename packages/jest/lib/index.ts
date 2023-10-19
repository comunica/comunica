import type * as RDF from '@rdfjs/types';
import matchers from './matchers';

export * from './expressions';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    interface Matchers<R> {
      toEqualBindings: (actual: RDF.Bindings) => R;
      toEqualBindingsArray: (actual: RDF.Bindings[]) => R;
      toEqualBindingsStream: (actual: RDF.Bindings[]) => Promise<R>;
    }
  }
}

(<any> globalThis).expect.extend(matchers);
