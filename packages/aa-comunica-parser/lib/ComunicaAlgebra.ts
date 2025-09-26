import type { Algebra } from '@traqula/algebra-transformations-1-2';

/**
 * The or unknown dissallows people using the parser to assume they know the complete algebra.
 * As a result of this unknown, TS will not cast to a dedicated type in an 'else' case of if statements with type guards.
 */
export type Operation = Lateral | Algebra.Operation | unknown;

export interface Lateral extends Omit<Algebra.Double, 'type'> {
  type: 'lateral';
}
