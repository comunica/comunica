import type * as RDF from '@rdfjs/types';
import { AlgebraFactory as AlgebraFactoryBase } from '@traqula/algebra-transformations-1-2';
import type { QuadTermName } from 'rdf-terms';
import type { DistinctTerms, Nodes } from './Algebra';
import { TypesComunica } from './TypesComunica';

/**
 * Factory for creating Comunica-specific SPARQL algebra operations.
 */
export class AlgebraFactory extends AlgebraFactoryBase {
  /**
   * Creates a nodes algebra operation for a given graph and variable.
   * @param graph The graph term to associate with the nodes operation.
   * @param variable The variable used to identify the nodes.
   * @return The constructed nodes algebra operation.
   */
  public createNodes(graph: RDF.Term, variable: RDF.Variable): Nodes {
    return {
      type: TypesComunica.NODES,
      graph,
      variable,
    };
  }

  /**
   * Creates a distinct-terms algebra operation for the given variables and term mapping.
   * @param variables The variables to apply distinct filtering on.
   * @param terms A mapping from variable names to quad term positions.
   * @return The constructed distinct-terms algebra operation.
   */
  public createDistinctTerms(
    variables: RDF.Variable[],
    terms: Record<string, QuadTermName>,
  ): DistinctTerms {
    return {
      type: TypesComunica.DISTINCT_TERMS,
      variables,
      terms,
    };
  }
}
