import type * as RDF from '@rdfjs/types';
import { AlgebraFactory as AlgebraFactoryBase } from '@traqula/algebra-transformations-1-2';
import type { Nodes } from './Algebra';
import { TypesComunica } from './TypesComunica';

export class AlgebraFactory extends AlgebraFactoryBase {
  public createNodes(graph: RDF.Term, variable: RDF.Variable): Nodes {
    return {
      type: TypesComunica.NODES,
      graph,
      variable,
    };
  }
}
