import { toAst as traqulaToAst, toAlgebra as traqualToAlgebra } from '@traqula/algebra-sparql-1-2';
import type { SparqlQuery } from '@traqula/rules-sparql-1-2';
import type { KnownAlgebra, Algebra } from './Algebra';

export { AlgebraFactory, algebraUtils } from '@traqula/algebra-transformations-1-2';

export function toAst(op: Algebra.Operation): SparqlQuery {
  return traqulaToAst(<KnownAlgebra.Operation> op);
}
export function toAlgebra(query: SparqlQuery): KnownAlgebra.Operation {
  return traqualToAlgebra(query);
}
