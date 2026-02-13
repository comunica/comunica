import type * as RDF from '@rdfjs/types';
import { AlgebraFactory as AlgebraFactoryBase } from '@traqula/algebra-transformations-1-2';
import type { Algebra, DistinctTerms, Nodes, Operation } from './Algebra';
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
    pattern: Algebra.Pattern,
    variables: RDF.Variable[],
    terms: Record<string, 'subject' | 'predicate' | 'object' | 'graph'>,
  ): DistinctTerms {
    return {
      type: TypesComunica.DISTINCT_TERMS,
      pattern,
      variables,
      terms,
    };
  }
}
