import type { KnownAlgebra } from '@comunica/algebra-sparql-comunica';

export type LateralKnownOperation = KnownAlgebra.Operation | Lateral;

export interface Lateral extends KnownAlgebra.Double {
  type: 'lateral';
}
