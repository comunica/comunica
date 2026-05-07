import type * as RDF from '@rdfjs/types';

/**
 * A partial result representing either a bindings or quads entry with associated metadata.
 */
export type PartialResult = {
  type: 'bindings';
  data: RDF.Bindings;
  metadata: Record<string, any>;
} | {
  type: 'quads';
  data: RDF.Quad;
  metadata: Record<string, any>;
};
