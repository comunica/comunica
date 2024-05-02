import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';

/**
 * A Quad.
 */
export type Quad = RDF.Quad;

/**
 * A stream of quads.
 * @see Quad
 */
export type QuadStream = AsyncIterator<RDF.Quad>;
