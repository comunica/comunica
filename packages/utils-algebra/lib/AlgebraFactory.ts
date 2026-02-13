import type * as RDF from '@rdfjs/types';
import { AlgebraFactory as AlgebraFactoryBase } from '@traqula/algebra-transformations-1-2';
import type { DistinctTerms, Nodes } from './Algebra';
import type { Operation } from './Algebra';
import { TypesComunica } from './TypesComunica';

export class AlgebraFactory extends AlgebraFactoryBase {
  public createNodes(graph: RDF.Term, variable: RDF.Variable): Nodes {
    return {
      type: TypesComunica.NODES,
      graph,
      variable,
    };
  }

  public createDistinctTerms(
    input: Operation,
    variables: RDF.Variable[],
    terms: Record<string, 'subject' | 'predicate' | 'object' | 'graph'>,
  ): DistinctTerms {
    return {
      type: TypesComunica.DISTINCT_TERMS,
      input,
      variables,
      terms,
    };
  }
}
