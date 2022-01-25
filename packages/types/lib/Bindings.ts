import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import type { Map } from 'immutable';

/**
 * An immutable solution mapping object.
 * This maps variables to a terms.
 *
 * Variables are represented as strings containing the variable name prefixed with '?'.
 * Blank nodes are represented as strings containing the blank node name prefixed with '_:'.
 * Terms are named nodes, literals or the default graph.
 */
export type Bindings = Map<string, RDF.Term>;

/**
 * A stream of bindings.
 * @see Bindings
 */
export type BindingsStream = AsyncIterator<Bindings>;
