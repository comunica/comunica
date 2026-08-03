import type * as RDF from '@rdfjs/types';
import matchers from './matchers';

declare global {
  // eslint-disable-next-line ts/no-namespace
  namespace jest {
    interface Matchers<R> {
      toEqualBindings: (actual: RDF.Bindings) => R;
      toEqualBindingsArray: (actual: RDF.Bindings[], ignoreOrder?: boolean) => R;
      toEqualBindingsStream: (actual: RDF.Bindings[], ignoreOrder?: boolean) => Promise<R>;
      toPassTest: (actual: any) => R;
      toPassTestVoid: () => R;
      toFailTest: (actual: string) => R;
    }
  }
}

(<any> globalThis).expect.extend(matchers);
