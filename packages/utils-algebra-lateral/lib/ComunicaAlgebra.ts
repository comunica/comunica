import type { Algebra } from '@comunica/utils-algebra';
import type { Algebra as TraqulaAlgebra } from '@traqula/algebra-transformations-1-2';

export type KnownOperationOrLat = Algebra.KnownOperation | Lateral;

// We need to confuse componentsJS enough with complex types.
export type Lateral = Algebra.Opened<TraqulaAlgebra.Double & {
  type: 'lateral';
}>;
