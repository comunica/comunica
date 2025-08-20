import { BindingsToQuadsIterator } from '@comunica/actor-query-operation-construct';
import type { Bindings, ComunicaDataFactory } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { mapTermsNested } from 'rdf-terms';

export function bindTemplateWithProjection(dataFactory: ComunicaDataFactory, bindings: Bindings, template: RDF.BaseQuad[], blankNodeCounter: number, unprojectedVariables: Set<string>): RDF.Quad[] {
  const assocVarBlankNode: [string, RDF.BlankNode][] = [];

  for (const v of unprojectedVariables) {
    assocVarBlankNode.push([ v, dataFactory.blankNode() ]);
  }
  const unprojectedVarBlankNodeMap: Map<string, RDF.BlankNode> = new Map(assocVarBlankNode);

  const quads: RDF.BaseQuad[] = <RDF.BaseQuad[]>template
  // Make sure the multiple instantiations of the template contain different blank nodes, as required by SPARQL 1.1.
    .map(BindingsToQuadsIterator.localizeQuad.bind(null, dataFactory, blankNodeCounter))
  // Bind variables to bound terms
    .map(x => bindQuadProjectionAware.bind(null, bindings, unprojectedVarBlankNodeMap)(x))
  // Remove quads that contained unbound terms, i.e., variables.
    .filter(Boolean);
  return <RDF.Quad[]>quads;
}

export function bindQuadProjectionAware(bindings: Bindings, unprojectedValueMap: Map<string, RDF.BlankNode>, pattern: RDF.BaseQuad): RDF.Quad | undefined {
  try {
    return mapTermsNested(<RDF.Quad>pattern, (term) => {
      const boundTerm = bindTermProjectionAware(bindings, term, unprojectedValueMap);
      if (!boundTerm) {
        throw new Error('Unbound term');
      }
      return boundTerm;
    });
  } catch {
    // Do nothing
  }
}

export function bindTermProjectionAware(bindings: Bindings, term: RDF.Term, unprojectedValueMap: Map<string, RDF.BlankNode>): RDF.Term | undefined {
  if (term.termType === 'Variable') {
    const value = bindings.get(term);
    if (value !== undefined) {
      return value;
    }
    const unprojectedBlankNode = unprojectedValueMap.get(term.value);
    return unprojectedBlankNode;
  }
  return term;
}
