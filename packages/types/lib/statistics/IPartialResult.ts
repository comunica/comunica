import type * as RDF from '@rdfjs/types';

export interface IPartialResult {
  data: RDF.Bindings | RDF.Quad;
  metadata: Record<string, any>;
}
