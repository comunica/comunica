import type * as RDF from '@rdfjs/types';

export type PartialResult = {
  type: 'bindings';
  data: RDF.Bindings;
  metadata: Record<string, any>;
} | { type: 'quad'; data: RDF.Quad; metadata: Record<string, any> };
